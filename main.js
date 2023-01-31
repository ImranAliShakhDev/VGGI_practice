'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let m = 0.17;
let a = 1.5 * m;
let b = 3 * m;
let c = 2 * m;
let d = 4 * m;
let C = d * d - c * c;
let f_v;
function deg2rad(angle) {
    return angle * Math.PI / 180;
}
// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iWorldInverseTransposeLocation = -1;
    this.iLightWorldPositionLocation = -1;
    this.iWorldLocation = -1;
    this.viewWorldPositionLocation = -1;

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

    let rotateToPointZero = m4.axisRotation([0.5, 0.5, 0.5], 0.7);
    let WorldMatrix = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(WorldMatrix, matAccum0);


    let modelViewProjection = m4.multiply(projection, matAccum1);

    let worldInverseMatrix = m4.inverse(matAccum1);
    let worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection); //worldViewProjection
    gl.uniformMatrix4fv(shProgram.iWorldInverseTransposeLocation, false, worldInverseTransposeMatrix);
    gl.uniformMatrix4fv(shProgram.iWorldLocation, false, matAccum1);
    gl.uniform3fv(shProgram.iLightWorldPositionLocation, getCoordParabola());
    gl.uniform3fv(shProgram.viewWorldPositionLocation, [100, 150, 200]);
    surface.Draw();
}

let InputCounter = 0.0;
window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "ArrowLeft":
            drawParabolaL();
            break;
        case "ArrowRight":
            drawParabolaR();
            break;
        default:
            return;
    }
});

function drawParabolaL() {
    InputCounter -= 0.05;
    draw();
}

function drawParabolaR() {
    InputCounter += 0.05;
    draw();
}

function getCoordParabola() {
    let cord = Math.cos(InputCounter) * 10;
    return [cord, 30, (cord * cord) * 2 - 100];
}
function CreateSurfaceData() {
    let step = 1.0;
    let DeltaT = 0.0001;
    let DeltaV = 0.0001;

    let vertexList = [];
    let normalsList = [];

    for (let t = 0; t < 360; t += step) {
        for (let v = 0; v < 360; v += step) {
            let unext = t + step;

            let xyz = CalcXYZ(t, v);

            vertexList.push(xyz[0], xyz[1], xyz[2]);

            let DerivativeT = CalcDerivativeT(t, v, DeltaT, xyz);
            let DerivativeV = CalcDerivativeV(t, v, DeltaV, xyz);

            let result = m4.cross(DerivativeV, DerivativeT);
            normalsList.push(result[0], result[1], result[2]);

            xyz = CalcXYZ(unext, v);
            vertexList.push(xyz[0], xyz[1], xyz[2]);

            DerivativeT = CalcDerivativeT(unext, v, DeltaT, xyz);
            DerivativeV = CalcDerivativeV(unext, v, DeltaV, xyz);

            result = m4.cross(DerivativeV, DerivativeT);
            normalsList.push(result[0], result[1], result[2]);
        }
    }

    return [vertexList, normalsList];
}

function CalcPar(vRad) {
    f_v = (a * b) / (Math.sqrt(a * a * Math.sin(deg2rad(vRad)) * Math.sin(deg2rad(vRad)) + b * b * Math.cos(deg2rad(vRad)) * Math.cos(deg2rad(vRad))));
    return f_v;
}

function CalcXYZ(t, v) {
    let CalcParData = CalcPar(v);
    return [0.5 * (CalcParData * (1 + Math.cos(deg2rad(t))) + C * ((1 - Math.cos(deg2rad(t))) / CalcParData)) * Math.cos(deg2rad(v)), 0.5 * (f_v * (1 + Math.cos(deg2rad(t))) + C * ((1 - Math.cos(deg2rad(t))) / CalcParData)) * Math.sin(deg2rad(v)), 0.5 * (CalcParData - (C / CalcParData)) * Math.sin(deg2rad(t))];
}

function CalcDerivativeT(t, v, DeltaT, xyz) {
    let Dxyz = CalcXYZ(t + DeltaT, v);

    let Dxdu = (Dxyz[0] - xyz[0]) / deg2rad(DeltaT);
    let Dydu = (Dxyz[1] - xyz[1]) / deg2rad(DeltaT);
    let Dzdu = (Dxyz[2] - xyz[2]) / deg2rad(DeltaT);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(t, v, DeltaV, xyz) {
    let Dxyz = CalcXYZ(t, v + DeltaV);

    let Dxdv = (Dxyz[0] - xyz[0]) / deg2rad(DeltaV);
    let Dydv = (Dxyz[1] - xyz[1]) / deg2rad(DeltaV);
    let Dzdv = (Dxyz[2] - xyz[2]) / deg2rad(DeltaV);

    return [Dxdv, Dydv, Dzdv];
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normals");

    shProgram.iWorldInverseTransposeLocation = gl.getUniformLocation(prog, "worldInverseTranspose");
    shProgram.iLightWorldPositionLocation = gl.getUniformLocation(prog, "lightWorldPosition");
    shProgram.iWorldLocation = gl.getUniformLocation(prog, "world");

    shProgram.viewWorldPositionLocation = gl.getUniformLocation(prog, "viewWorldPosition");
    surface = new Model('Surface');
    let surfaceData = CreateSurfaceData()
    surface.BufferData(surfaceData[0], surfaceData[1]);


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

    draw();
}