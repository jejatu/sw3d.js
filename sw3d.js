var scanvas = document.getElementById('canvas');
var sctx = scanvas.getContext('2d');
var canvas = document.createElement('canvas');
canvas.width = scanvas.width / 5;
canvas.height = scanvas.height / 5;
var ctx = canvas.getContext('2d');
var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

var camera = { position: Float3(0, 0, 20),
               rotation: Float3(),
               zoom: 600 };
               
var box = [ Vertex(Float3(-1, -1, -1), Float2(0, 0)),
            Vertex(Float3(-1, 1, -1), Float2(0, 1)),
            Vertex(Float3(1, 1, -1), Float2(1, 1)),
            Vertex(Float3(-1, -1, -1), Float2(0, 0)),
            Vertex(Float3(1, 1, -1), Float2(1, 1)),
            Vertex(Float3(1, -1, -1), Float2(1, 0)),
            Vertex(Float3(-1, -1, 1), Float2(0, 0)),
            Vertex(Float3(-1, 1, 1), Float2(0, 1)),
            Vertex(Float3(1, 1, 1), Float2(1, 1)),
            Vertex(Float3(-1, -1, 1), Float2(0, 0)),
            Vertex(Float3(1, 1, 1), Float2(1, 1)),
            Vertex(Float3(1, -1, 1), Float2(1, 0)),
            Vertex(Float3(-1, -1, -1), Float2(0, 0)),
            Vertex(Float3(-1, 1, -1), Float2(0, 1)),
            Vertex(Float3(-1, 1, 1), Float2(1, 1)),
            Vertex(Float3(-1, -1, -1), Float2(0, 0)),
            Vertex(Float3(-1, 1, 1), Float2(1, 1)),
            Vertex(Float3(-1, -1, 1), Float2(1, 0)),
            Vertex(Float3(1, -1, -1), Float2(0, 0)),
            Vertex(Float3(1, 1, -1), Float2(0, 1)),
            Vertex(Float3(1, 1, 1), Float2(1, 1)),
            Vertex(Float3(1, -1, -1), Float2(0, 0)),
            Vertex(Float3(1, 1, 1), Float2(1, 1)),
            Vertex(Float3(1, -1, 1), Float2(1, 0)) ];
refresh(box);
            
var keys = [];

var textures = {};

window.onkeydown = function(event) {
    keys[event.keyCode] = true;
};

window.onkeyup = function(event) {
    keys[event.keyCode] = false;
};

window.onload = function() {
    var sources = {
        test: "assets/test.png",
    };
    loadImages(sources, onTick);
};

function loadImages(sources, callback) {
    var images = {};
    var loadedImages = 0;
    var numImages = 0;
    for (var src in sources) {
        numImages++;
    }
    for (var src in sources) {
        images[src] = new Image();
        images[src].onload = function(){
            if (++loadedImages >= numImages) {
                textures[src] = getImageData(images[src]);
                callback();
            }
        };
        images[src].src = sources[src];
    }
}

function onTick() {
    requestAnimationFrame(onTick);
    draw(box);
    update();
    refresh(box);
    draw(box, textures["test"]);
    ctx.putImageData(canvasData, 0, 0);
    sctx.clearRect(0, 0, scanvas.width, scanvas.height);
    sctx.drawImage(canvas, 0, 0, scanvas.width, scanvas.height);
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

function refresh(shape) {
    for (var i = 0; i < shape.length; i++)
        shape[i].screen = toScreenCoords(shape[i].position, camera);
}

function draw(shape, texture) {
    for (var i = 0; i < shape.length; i += 3) {
        if (i + 2 < shape.length) {
            if (typeof shape[i].screen !== 'undefined' &&
                typeof shape[i+1].screen !== 'undefined' &&
                typeof shape[i+2].screen !== 'undefined') {
                drawTriangle([ shape[i], shape[i+1], shape[i+2] ], texture);
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

function drawLine(vertex1, vertex2, texture) {
    var x0 = vertex1.screen.x | 0;
    var y0 = vertex1.screen.y | 0;
    var x1 = vertex2.screen.x | 0;
    var y1 = vertex2.screen.y | 0;
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var length = Math.sqrt(dx * dx + dy * dy);
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    
    var color = Float4(0, 0, 0, 0);
    
    var i = 0;
    while (x0 !== x1 || y0 !== y1) {
        if (typeof texture !== 'undefined') {
            var interp = i / length;
            var tx = (1.0 - interp) * vertex1.texcoord.x + interp * vertex2.texcoord.x;
            var ty = (1.0 - interp) * vertex1.texcoord.y + interp * vertex2.texcoord.y;
            color = getTextureColor(texture, Float2(tx, ty));
            i++;
        }
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

function drawTriangle(triangle, texture) {
    var order = getTriangleOrder(triangle);
    var d0 = (triangle[order[1]].screen.x - triangle[order[0]].screen.x) / (triangle[order[1]].screen.y - triangle[order[0]].screen.y)
    var d1 = (triangle[order[2]].screen.x - triangle[order[0]].screen.x) / (triangle[order[2]].screen.y - triangle[order[0]].screen.y)
    
    var size = triangle[order[1]].screen.y - triangle[order[0]].screen.y;
    for (var i = 0; i < size; i++) {
        var interp = i / size;
        var texcoord1 = Float2(interp * triangle[order[1]].texcoord.x + (1.0 - interp) * triangle[order[0]].texcoord.x,
                               interp * triangle[order[1]].texcoord.y + (1.0 - interp) * triangle[order[0]].texcoord.y);
        var texcoord2 = Float2(interp * triangle[order[2]].texcoord.x + (1.0 - interp) * triangle[order[0]].texcoord.x,
                               interp * triangle[order[2]].texcoord.y + (1.0 - interp) * triangle[order[0]].texcoord.y);
        var vertex1 = Vertex(Float3(), texcoord1);
        var vertex2 = Vertex(Float3(), texcoord2);
        vertex1.screen = Float2(triangle[order[0]].screen.x + i * d0, triangle[order[0]].screen.y + i);
        vertex2.screen = Float2(triangle[order[0]].screen.x + i * d1, triangle[order[0]].screen.y + i);
        drawLine(vertex1, vertex2, texture);
        if (i > canvasData.height)
            break;
    }
    
    d0 = (triangle[order[2]].screen.x - triangle[order[1]].screen.x) / (triangle[order[2]].screen.y - triangle[order[1]].screen.y);
    
    var size = triangle[order[2]].screen.y - triangle[order[1]].screen.y;
    for (var i = size; i > 0; i--) {
        var interp = (size - i) / size;
        var texcoord1 = Float2(interp * triangle[order[2]].texcoord.x + (1.0 - interp) * triangle[order[1]].texcoord.x,
                               interp * triangle[order[2]].texcoord.y + (1.0 - interp) * triangle[order[1]].texcoord.y);
        var texcoord2 = Float2(interp * triangle[order[2]].texcoord.x + (1.0 - interp) * triangle[order[0]].texcoord.x,
                               interp * triangle[order[2]].texcoord.y + (1.0 - interp) * triangle[order[0]].texcoord.y);
        var vertex1 = Vertex(Float3(), texcoord1);
        var vertex2 = Vertex(Float3(), texcoord2);
        vertex1.screen = Float2(triangle[order[2]].screen.x - i * d0, triangle[order[2]].screen.y - i);
        vertex2.screen = Float2(triangle[order[2]].screen.x - i * d1, triangle[order[2]].screen.y - i);
        drawLine(vertex1, vertex2, texture);
        if (i > canvasData.height)
            break; 
    }
}

function getTriangleOrder(triangle) {
    var order = [];
    if (triangle[0].screen.y < triangle[1].screen.y) {
        if (triangle[0].screen.y < triangle[2].screen.y)
            order[0] = 0;
        else
            order[0] = 2;
    }
    else {
        if (triangle[1].screen.y < triangle[2].screen.y)
            order[0] = 1;
        else
            order[0] = 2;
    }
    
    if (triangle[0].screen.y > triangle[1].screen.y) {
        if (triangle[0].screen.y > triangle[2].screen.y)
            order[2] = 0;
        else
            order[2] = 2;
    }
    else {
        if (triangle[1].screen.y > triangle[2].screen.y)
            order[2] = 1;
        else
            order[2] = 2;
    }
    order[1] = 3 - (order[0] + order[2]);
    return order;
}

function toScreenCoords(point, camera) {
    var x = point.x + camera.position.x;
    var y = point.y + camera.position.y;
    var z = point.z + camera.position.z;
    
    var temp = Float3();
    temp.z = z*Math.cos(camera.rotation.y) - x*Math.sin(camera.rotation.y);
    temp.x = z*Math.sin(camera.rotation.y) + x*Math.cos(camera.rotation.y);
    temp.y = y;
    
    x = temp.x;
    y = temp.y;
    z = temp.z;

    temp.y = y*Math.cos(camera.rotation.x) - z*Math.sin(camera.rotation.x);
    temp.z = y*Math.sin(camera.rotation.x) + z*Math.cos(camera.rotation.x);
    temp.x = x;
    
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

function getImageData(image) {
    var imageCanvas = document.createElement("canvas");
    imageCanvas.width = image.width;
    imageCanvas.height = image.height;
    var imageCtx = imageCanvas.getContext('2d');
    imageCtx.drawImage(image, 0, 0);
    return imageCtx.getImageData(0, 0, image.width, image.height);
}

function getTextureColor(texture, texcoord) {
    var index = ((texcoord.x * texture.width | 0) + (texcoord.y * texture.height | 0) * texture.width) * 4;
    return Float4(texture.data[index++], texture.data[index++], texture.data[index++], texture.data[index++]);
}

function Vertex(position, texcoord) {
    return { position: position, screen: Float2(0, 0), texcoord: texcoord };
}

function Float4(x, y, z, w) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    z = typeof z !== 'undefined' ? z : 0;
    w = typeof w !== 'undefined' ? w : 0;
    return { x: x, y: y, z: z, w: w };
}

function Float3(x, y, z) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    z = typeof z !== 'undefined' ? z : 0;
    return { x: x, y: y, z: z };
}

function Float2(x, y) {
    x = typeof x !== 'undefined' ? x : 0;
    y = typeof y !== 'undefined' ? y : 0;
    return { x: x, y: y };
}