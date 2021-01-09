var glMatrix = require('gl-matrix');
var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;
var webglet = require('webglet');

require('./util');
var Flock = require('./flock');
var UI = require('./ui');

var Fireflies = function(options) {
    webglet.App.call(this, options);


    this.lastUpdateTime = null;
    this.timestep = 1 / 60;
    this.accum = 0;

    this.createAudio();

    this.createFlock();

    this.setBlending();

    this.createRenderers();

    this.createCachedVectors();

    this.createUI();
};
Fireflies.prototype = Object.create(webglet.App.prototype);
Fireflies.prototype.constructor = Fireflies;

Fireflies.prototype.createFlock = function() {
    var maxPosition = [
        screen.width,
        screen.height,
        (screen.width + screen.height) / 2
    ];
    this.flock = new Flock(15, maxPosition, this.audioContext,
                           this.audioGain);
};

Fireflies.prototype.setBlending = function() {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

Fireflies.prototype.createRenderers = function() {
    // For rendering to the framebuffer
    var vs = document.getElementById('point-sprite-vert').textContent;
    var fs = document.getElementById('point-sprite-frag').textContent;
    this.flockRenderer = new webglet.FramebufferRenderer(
            screen.width, screen.height, vs, fs);

    this.projectionMatrix = mat4.create();
    this.modelviewMatrix = mat4.create();

    this.litTexture = new webglet.Texture(720, 720);
    this.litTexture.loadFromFile('lit.png');

    // For downsampling and blurring the texture
    this.blurRenderers = [];
    this.blurMeshes = [];
    this.blurProjectionMatrices = [];
    this.blurModelviewMatrix = mat4.create();

    var vs = document.getElementById('texture-vert').textContent;
    var fs = document.getElementById('blur-frag').textContent;
    for (var i = 0; i < 3; i++) {
        var width = screen.width >> (i + 1);
        var height = screen.height >> (i + 1);
        var renderer = new webglet.FramebufferRenderer(
                width, height, vs, fs
        );
        renderer.setUniform('uOffset', [1 / width, 1 / height]);

        var mesh = new webglet.RectMesh(width, height, gl.STATIC_DRAW, null,
                                        null, gl.STATIC_DRAW);

        var projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix, 0, width, height, 0, -1, 1);

        renderer.setUniform('uProjectionMatrix', projectionMatrix);
        renderer.setUniform('uModelviewMatrix', this.blurModelviewMatrix);

        this.blurRenderers.push(renderer);
        this.blurMeshes.push(mesh);
        this.blurProjectionMatrices.push(projectionMatrix);
    }

    // For blending the texture
    var vs = document.getElementById('texture-vert').textContent;
    var fs = document.getElementById('blend-frag').textContent;
    this.blendRenderer = new webglet.BasicRenderer(vs, fs);

    for (var i = 0; i < this.blurRenderers.length; i++) {
        this.blendRenderer.setUniform('uSampler' + i, i);
    }

    this.orthoProjectionMatrix = mat4.create();
    mat4.ortho(this.orthoProjectionMatrix, 0, 1,
               1, 0, -1, 1);
    this.blendRenderer.setUniform('uProjectionMatrix',
                                  this.orthoProjectionMatrix);

    this.orthoModelviewMatrix = mat4.create();
    this.blendRenderer.setUniform('uModelviewMatrix',
                                  this.orthoModelviewMatrix);

    this.textureMesh = new webglet.RectMesh(1, 1, gl.STATIC_DRAW, null,
                                            null, gl.STATIC_DRAW);
};

Fireflies.prototype.createCachedVectors = function() {
    this.target = vec3.create();
    this.eye = vec3.create();
};

Fireflies.prototype.createUI = function() {
    this.ui = new UI(this);
    this.target = vec3.create();
    this.eye = vec3.create();
};


Fireflies.prototype.createAudio = function() {
    this.audioContext = new AudioContext();
    this.audioGain = this.audioContext.createGain();
    this.audioGain.gain.value = 0;
    this.audioGain.connect(this.audioContext.destination);
};

Fireflies.prototype.runUpdates = function() {
    if (this.lastUpdateTime == null) {
        this.lastUpdateTime = Date.now();
    }

    var time = Date.now();
    var dt = (time - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = time;

    this.accum += dt;

    while (this.accum >= this.timestep) {
        this.update(this.timestep);
        this.accum -= this.timestep;
    }
};

Fireflies.prototype.update = function(timestep) {
    this.flock.update(timestep);
};

Fireflies.prototype.draw = function() {
    this.updateViewport();
    this.runUpdates();
    this.setTransformationMatrices();
    this.flock.updateMesh();
    this.flock.updateAudio(this.modelviewMatrix);

    this.flockRenderer.framebuffer.clear([0, 0, 0, 1]);

    this.litTexture.begin();
    this.flockRenderer.render(this.flock.mesh);
    this.litTexture.end();

    for (var i = 0; i < this.blurRenderers.length; i++) {
        var renderer = this.blurRenderers[i];

        if (i == 0) {
            this.flockRenderer.framebuffer.texture.begin();
        }
        else {
            this.blurRenderers[i - 1].framebuffer.texture.begin();
        }

        renderer.render(this.blurMeshes[i]);

        if (i == 0) {
            this.flockRenderer.framebuffer.texture.end();
        }
        else {
            this.blurRenderers[i - 1].framebuffer.texture.end();
        }
    }

    // Blend the downsampled textures
    for (var i = 0; i < this.blurRenderers.length; i++) {
        this.blurRenderers[i].framebuffer.texture.begin(i);
    }

    this.blendRenderer.render(this.textureMesh);

    for (var i = 0; i < this.blurRenderers.length; i++) {
        this.blurRenderers[i].framebuffer.texture.end();
    }

    window.requestAnimationFrame(this.draw.bind(this));
};

Fireflies.prototype.setTransformationMatrices = function() {
    mat4.perspective(this.projectionMatrix, Math.PI / 3,
                     this.canvas.width / this.canvas.height,
                     0.000001, 10000);

    vec3.copy(this.eye, this.flock.boids[0].position);
    vec3.copy(this.target, this.flock.center());
    mat4.lookAt(this.modelviewMatrix, this.eye, this.target, [0, 1, 0]);

    this.flockRenderer.setUniform('uProjectionMatrix',
                                  this.projectionMatrix);
    this.flockRenderer.setUniform('uModelviewMatrix',
                                  this.modelviewMatrix);
    this.flockRenderer.setUniform('uCameraPosition',
                                  this.flock.boids[0].position);
};

document.addEventListener('DOMContentLoaded', function() {
    window.app = new Fireflies({
        canvas: document.getElementById('main-canvas')
    });
    window.requestAnimationFrame(window.app.draw.bind(window.app));
});
