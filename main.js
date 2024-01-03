'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let line;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iVertexNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }
    this.BufferNormalData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormalVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormalVertex);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
    this.DrawLine = () => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormalVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);
    let normalMatrix = m4.identity();
    m4.inverse(modelView, normalMatrix);
    normalMatrix = m4.transpose(normalMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    gl.uniform3fv(shProgram.iDiffuseColor,
        hexToRgb(document.getElementById('diff').value));
    gl.uniform3fv(shProgram.iAmbientColor,
        hexToRgb(document.getElementById('ambi').value));
    gl.uniform3fv(shProgram.iSpecularColor,
        hexToRgb(document.getElementById('spec').value));

    line.BufferData([0, 0, 0, 1, Math.sin(Date.now() * 0.001), 1])
    surface.Draw();
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, -1]);
    gl.uniform3fv(shProgram.iLightDir, [1, Math.sin(Date.now() * 0.001), 1]);

    line.DrawLine();
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ]
}

function get(u, v, a, b) {
    const x = a * (b - Math.cos(u)) * Math.sin(u) * Math.cos(v);
    const y = a * (b - Math.cos(u)) * Math.sin(u) * Math.sin(v);
    const z = Math.cos(u);
    return [x, y, z]
}
function facetAverage(u, v, a, b) {
    const steps = 30;
    const uStep = (1 / steps) * Math.PI;
    const vStep = (1 / steps) * Math.PI * 2;
    let v0 = get(u, v, a, b);
    let v1 = get(u + uStep, v, a, b);
    let v2 = get(u, v + vStep, a, b);
    let v3 = get(u - uStep, v + vStep, a, b);
    let v4 = get(u - uStep, v, a, b);
    let v5 = get(u - uStep, v - vStep, a, b);
    let v6 = get(u, v - vStep, a, b);
    let v01 = m4.subtractVectors(v1, v0)
    let v02 = m4.subtractVectors(v2, v0)
    let v03 = m4.subtractVectors(v3, v0)
    let v04 = m4.subtractVectors(v4, v0)
    let v05 = m4.subtractVectors(v5, v0)
    let v06 = m4.subtractVectors(v6, v0)
    let n1 = m4.normalize(m4.cross(v01, v02))
    let n2 = m4.normalize(m4.cross(v02, v03))
    let n3 = m4.normalize(m4.cross(v03, v04))
    let n4 = m4.normalize(m4.cross(v04, v05))
    let n5 = m4.normalize(m4.cross(v05, v06))
    let n6 = m4.normalize(m4.cross(v06, v01))
    let n = [(n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
    (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
    (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0]
    n = m4.normalize(n);
    return n;
}

function updateFigure() {
    surface.BufferData(CreateSurfaceData());
    surface.BufferNormalData(CreateSurfaceNormalData());
}

function drawing() {
    draw()
    window.requestAnimationFrame(drawing)
}


function CreateSurfaceData() {
    let vertexList = [];
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const stepsU = parseInt(document.getElementById('uSteps').value);
    const stepsV = parseInt(document.getElementById('vSteps').value);
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI;
        const uStep = (1 / stepsU) * Math.PI;
        for (let j = 0; j <= stepsV; j++) {
            const v = (j / stepsV) * Math.PI * 2;
            const vStep = (1 / stepsV) * Math.PI * 2;
            vertexList.push(...get(u, v, a, b));
            vertexList.push(...get(u + uStep, v, a, b));
            vertexList.push(...get(u, v + vStep, a, b));
            vertexList.push(...get(u, v + vStep, a, b));
            vertexList.push(...get(u + uStep, v, a, b));
            vertexList.push(...get(u + uStep, v + vStep, a, b));
        }
    }
    return vertexList;
}
function CreateSurfaceNormalData() {
    let normalList = [];
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const stepsU = parseInt(document.getElementById('uSteps').value);
    const stepsV = parseInt(document.getElementById('vSteps').value);
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI;
        const uStep = (1 / stepsU) * Math.PI;
        for (let j = 0; j <= stepsV; j++) {
            const v = (j / stepsV) * Math.PI * 2;
            const vStep = (1 / stepsV) * Math.PI * 2;
            let n = facetAverage(u, v, a, b);
            normalList.push(...n);
            n = facetAverage(u + uStep, v, a, b);
            normalList.push(...n);
            n = facetAverage(u, v + vStep, a, b);
            normalList.push(...n);
            n = facetAverage(u, v + vStep, a, b);
            normalList.push(...n);
            n = facetAverage(u + uStep, v, a, b);
            normalList.push(...n);
            n = facetAverage(u + uStep, v + vStep, a, b);
            normalList.push(...n);
        }
    }

    return normalList;
}




/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormalVertex = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
    shProgram.iLightDir = gl.getUniformLocation(prog, "lightDir");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    surface.BufferNormalData(CreateSurfaceNormalData());
    line = new Model()
    line.BufferData([0, 0, 0, 1, 1, 1])

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    drawing();
}
