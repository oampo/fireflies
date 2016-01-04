var vec3 = require('gl-matrix').vec3;
var webglet = require('webglet');

var Boid = require('./boid');

var Flock = function(numBoids, maxPosition, audioContext, audioDestination) {
    this.numBoids = numBoids;
    this.createBoids(maxPosition, audioContext, audioDestination);
    this.createMesh();
};

Flock.prototype.createBoids = function(maxPosition, audioContext,
                                       audioDestination) {
    this.maxPosition = maxPosition;

    this.boids = [];
    for (var i = 0; i < this.numBoids; i++) {
        this.boids.push(new Boid(maxPosition, audioContext, audioDestination));
    }
};

Flock.prototype.createMesh = function() {
    this.mesh = new webglet.Mesh((this.numBoids - 1) * 6, gl.TRIANGLES,
                                 gl.STREAM_DRAW, gl.STATIC_DRAW,
                                 null, gl.STATIC_DRAW);
};

Flock.prototype.reset = function() {
    for (var i = 0; i < this.boids.length; i++) {
        var boid = this.boids[i];
        boid.reset(this.maxPosition);
    }
};

Flock.prototype.setWeight = function(type, value) {
    for (var i = 0; i < this.boids.length; i++) {
        var boid = this.boids[i];
        boid[type] = value;
    }
};

Flock.prototype.update = function(timestep) {
    for (var i = 0; i < this.boids.length; i++) {
        var boid = this.boids[i];
        boid.update(this.boids, timestep);
    }
};

Flock.prototype.updateMesh = function() {
    var vertices = this.mesh.vertexBuffer.array;
    var texCoords = this.mesh.texCoordBuffer.array;
    var colors = this.mesh.colorBuffer.array;

    var vertex = 0;
    var color = 0;
    var texCoord = 0;
    for (var i = 1; i < this.boids.length; i++) {
        var boid = this.boids[i];
        var pos = boid.position;

        for (var j = 0; j < 6; j++) {
            vertices[vertex++] = pos[0];
            vertices[vertex++] = pos[1];
            vertices[vertex++] = pos[2];

            colors[color++] = 1;
            colors[color++] = 1;
            colors[color++] = 1;
            colors[color++] = 1;
        }

        texCoords[texCoord++] = 0;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 0;
        texCoords[texCoord++] = 0;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 0;
        texCoords[texCoord++] = 0;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 1;
        texCoords[texCoord++] = 0;
    }

    this.mesh.vertexBuffer.setValues();
    this.mesh.texCoordBuffer.setValues();
    this.mesh.colorBuffer.setValues();
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
