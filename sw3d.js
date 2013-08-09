var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

var camera = { 'position': Float3(),
               'rotation': Float3(),
               'zoom': 200 };
               
var box = [ Float3(-1, -1, 10),
            Float3(-1, 1, 10),
            Float3(1, 1, 10),
            Float3(-1, -1, 10),
            Float3(1, 1, 10),
            Float3(1, -1, 10) ];
            
var keys = [];

window.onkeydown = function(event) {
    keys[event.keyCode] = true;
};

window.onkeyup = function(event) {
    keys[event.keyCode] = false;
};

onTick();

function onTick() {
    requestAnimationFrame(onTick);
    clear(box);
    update();
    draw(box);
    ctx.putImageData(canvasData, 0, 0);
}

function update() {
    if (keys['87'])
        moveCameraForward();
    if (keys['83'])
        moveCameraBackward();
    if (keys['81'])
        moveCameraLeft();
    if (keys['69'])
        moveCameraRight();
    if (keys['65'])
        camera.rotation.y += 0.05;
    if (keys['68'])
        camera.rotation.y -= 0.05;
    if (keys['90'])
        camera.rotation.x += 0.05;
    if (keys['67'])
        camera.rotation.x -= 0.05;
}

function clear(shape) {
    coords = shapeToCoords(shape);
    for (var i = 0; i < coords.length; i += 3) {
        if (i + 2 < coords.length) {
            if (typeof coords[i] !== 'undefined' &&
                typeof coords[i+1] !== 'undefined' &&
                typeof coords[i+2] !== 'undefined') {
                var color = Float4(0, 0, 0, 0);
                drawTriangle([ coords[i], coords[i+1], coords[i+2] ], color);
            }
        }
    }
}

function draw(shape) {
    coords = shapeToCoords(shape);
    for (var i = 0; i < coords.length; i += 3) {
        if (i + 2 < coords.length) {
            if (typeof coords[i] !== 'undefined' &&
                typeof coords[i+1] !== 'undefined' &&
                typeof coords[i+2] !== 'undefined') {
                var color = Float4(0, 0, 0, 255);
                drawTriangle([ coords[i], coords[i+1], coords[i+2] ], color);
            }
        }
    }
}

function setPixel(point, color) {
    if (point.x >= 0 && point.x < canvasData.width && point.y >= 0 && point.y < canvasData.height) {
        var index = (point.x + point.y * canvasData.width) * 4;
        canvasData.data[index++] = color.x;
        canvasData.data[index++] = color.y;
        canvasData.data[index++] = color.z;
        canvasData.data[index++] = color.w;
    }
}

function drawLine(point1, point2, color) {
    var x0 = point1.x | 0;
    var y0 = point1.y | 0;
    var x1 = point2.x | 0;
    var y1 = point2.y | 0;
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    
    while (x0 !== x1 || y0 !== y1) {
        setPixel(Float2(x0, y0), color);
        var e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function drawTriangle(triangle, color) {
    order = getVertexOrder(triangle);
    var d0 = (triangle[order[1]].x - triangle[order[0]].x) / (triangle[order[1]].y - triangle[order[0]].y)
    var d1 = (triangle[order[2]].x - triangle[order[0]].x) / (triangle[order[2]].y - triangle[order[0]].y)
    
    for (var i = 0; i < triangle[order[1]].y - triangle[order[0]].y; i++) {
        drawLine(Float2(triangle[order[0]].x + i * d0, triangle[order[0]].y + i), Float2(triangle[order[0]].x + i * d1, triangle[order[0]].y + i), color);
        if (i > canvasData.width)
            break;
    }
    
    d0 = (triangle[order[2]].x - triangle[order[1]].x) / (triangle[order[2]].y - triangle[order[1]].y);
    
    for (var i = triangle[order[2]].y - triangle[order[1]].y; i > 0; i--) {
        drawLine(Float2(triangle[order[2]].x - i * d0, triangle[order[2]].y - i), Float2(triangle[order[2]].x - i * d1, triangle[order[2]].y - i), color);
        if (i > canvasData.width)
            break;
    }
}

function getVertexOrder(triangle) {
    var order = [];
    if (triangle[0].y < triangle[1].y) {
        if (triangle[0].y < triangle[2].y)
            order[0] = 0;
        else
            order[0] = 2;
    }
    else {
        if (triangle[1].y < triangle[2].y)
            order[0] = 1;
        else
            order[0] = 2;
    }
    
    if (triangle[0].y > triangle[1].y) {
        if (triangle[0].y > triangle[1].y)
            order[2] = 0;
        else
            order[2] = 2;
    }
    else {
        if (triangle[1].y > triangle[2].y)
            order[2] = 1;
        else
            order[2] = 2;
    }
    order[1] = 3 - (order[0] + order[2]);
    return order;
}

function shapeToCoords(shape) {
    var coords = [];
    for (var i = 0; i < shape.length; i++) {
        coords.push(toScreenCoords(shape[i], camera));
    }
    return coords;
}

function toScreenCoords(point, camera) {
    var x = point.x + camera.position.x;
    var y = point.y + camera.position.y;
    var z = point.z + camera.position.z;
    
    var temp = Float3();
    temp.z = z*Math.cos(camera.rotation.y) - x*Math.sin(camera.rotation.y)
    temp.x = z*Math.sin(camera.rotation.y) + x*Math.cos(camera.rotation.y)
    temp.y = y
    
    x = temp.x;
    y = temp.y;
    z = temp.z;

    temp.y = y*Math.cos(camera.rotation.x) - z*Math.sin(camera.rotation.x)
    temp.z = y*Math.sin(camera.rotation.x) + z*Math.cos(camera.rotation.x)
    temp.x = x
    
    x = temp.x;
    y = temp.y;
    z = temp.z;

    var screen;
    if (z > 0) {
        screen = Float2();
        screen.x = (x / z * camera.zoom + canvasData.width / 2.0) | 0;
        screen.y = (y / z * camera.zoom + canvasData.height / 2.0) | 0;
    }
    return screen;
}

function moveCameraForward() {
    camera.position.x += Math.sin(camera.rotation.y) * 0.1;
    camera.position.z -= Math.cos(camera.rotation.y) * 0.1;
}

function moveCameraBackward() {
    camera.position.x -= Math.sin(camera.rotation.y) * 0.1;
    camera.position.z += Math.cos(camera.rotation.y) * 0.1;
}

function moveCameraLeft() {
    camera.position.x += Math.sin(camera.rotation.y + Math.PI / 2) * 0.1;
    camera.position.z -= Math.cos(camera.rotation.y + Math.PI / 2) * 0.1;
}

function moveCameraRight() {
    camera.position.x += Math.sin(camera.rotation.y - Math.PI / 2) * 0.1;
    camera.position.z -= Math.cos(camera.rotation.y - Math.PI / 2) * 0.1;
}

function Float4(x, y, z, w) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    z = typeof z !== 'undefined' ? z : 0;
    w = typeof w !== 'undefined' ? w : 0;
    return { 'x': x, 'y': y, 'z': z, 'w': w };
}

function Float3(x, y, z) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    z = typeof z !== 'undefined' ? z : 0;
    return { 'x': x, 'y': y, 'z': z };
}

function Float2(x, y) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    return { 'x': x, 'y': y };
}