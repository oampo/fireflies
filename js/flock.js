var vec3 = require('gl-matrix').vec3;
var webglet = require('webglet');

var Boid = require('./boid');

var Flock = function(numBoids, maxPosition, audioContext) {
    this.numBoids = numBoids;
    this.createBoids(maxPosition, audioContext);
    this.createMesh();
};

Flock.prototype.createBoids = function(maxPosition, audioContext) {
    this.boids = [];
    for (var i = 0; i < this.numBoids; i++) {
        this.boids.push(new Boid(maxPosition, audioContext));
    }
};

Flock.prototype.createMesh = function() {
    this.mesh = new webglet.Mesh((this.numBoids - 1) * 6, gl.TRIANGLES,
                                 gl.STREAM_DRAW, gl.STATIC_DRAW,
                                 null, gl.STATIC_DRAW);
};

// TODO: Write directly to mesh buffers
Flock.prototype.update = function() {
    var vertices = [];
    var texCoords = [];
    var colors = [];
    for (var i = 0; i < this.boids.length; i++) {
        var boid = this.boids[i];
        boid.update(this.boids);
        if (i == 0) {
            continue;
        }
        var pos = boid.position;
        vertices.push(pos[0], pos[1], pos[2],
                      pos[0], pos[1], pos[2],
                      pos[0], pos[1], pos[2],
                      pos[0], pos[1], pos[2],
                      pos[0], pos[1], pos[2],
                      pos[0], pos[1], pos[2]);
        texCoords.push(0, 1,
                       0, 0,
                       1, 1,
                       0, 0,
                       1, 1,
                       1, 0);
        for (var j = 0; j < 6; j++) {
            colors.push(1, 1, 1, 1);
        }
    }
    this.mesh.vertexBuffer.setValues(vertices);
    this.mesh.texCoordBuffer.setValues(texCoords);
    this.mesh.colorBuffer.setValues(colors);
};

Flock.prototype.updateAudio = function(modelview) {
    for (var i = 1; i < this.boids.length; i++) {
        var boid = this.boids[i];
        boid.updateAudio(modelview);
    }
};

Flock.prototype.center = function() {
    var center = vec3.create();
    for (var i = 0; i < this.boids.length; i++) {
        var boid = this.boids[i];
        vec3.add(center, center, boid.position);
    }
    vec3.scale(center, center, 1 / this.boids.length);
    return center;
};

module.exports = Flock;
