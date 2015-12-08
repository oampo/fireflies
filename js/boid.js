var vec3 = require('gl-matrix').vec3;

var BoidAudio = require('./boid-audio.js');

var Boid = function(maxPosition, audioContext) {
    this.maxPosition = maxPosition;
    this.maxVel = 10;
    this.maxForce = 0.2;

    this.position = vec3.fromValues(
        Math.random() * this.maxPosition[0],
        Math.random() * this.maxPosition[1],
        Math.random() * this.maxPosition[2]
    );

    this.velocity = vec3.fromValues(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    );
    // Max velocity magnitude of 1
    vec3.normalize(this.velocity, this.velocity);

    this.acceleration = vec3.create();

    this.centerDistance = this.maxPosition[2];
    this.avoidDistance = this.maxPosition[2] / 8;
    this.matchDistance = this.maxPosition[2] / 4;

    this.centerWeight = 0.8;
    this.avoidWeight = 1;
    this.matchWeight = 0.8;

    // Create calculation vectors
    this.steer = vec3.create();
    this.diff = vec3.create();
    this.sum = vec3.create();

    this.audio = new BoidAudio(audioContext);
};

Boid.prototype.update = function(boids) {
    this.avoid(boids);
    this.matchVelocity(boids);
    this.moveToCenter(boids);
    vec3.add(this.velocity, this.velocity, this.acceleration);
    vec3.limit(this.velocity, this.velocity, this.maxVel);
    vec3.add(this.position, this.position, this.velocity);
    vec3.set(this.acceleration, 0, 0, 0);
};

Boid.prototype.updateAudio = function(modelview) {
    this.audio.update(this.position, modelview);
};

// TODO: Use squared distance in calculations to avoid length sqrt
Boid.prototype.avoid = function(boids) {
    vec3.set(this.steer, 0, 0, 0);
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
        var boid = boids[i];
        if (boid == this) {
            continue;
        }

        vec3.subtract(this.diff, this.position, boid.position);
        var distance = vec3.length(this.diff);

        if (distance > this.avoidDistance) {
            continue;
        }

        vec3.normalize(this.diff, this.diff);
        vec3.scale(this.diff, this.diff, 1 / distance);
        vec3.add(this.steer, this.steer, this.diff);
        count += 1;
    }

    if (count == 0) {
        return;
    }

    vec3.scale(this.steer, this.steer, 1 / count);
    this.doSteer(this.avoidWeight);
};

Boid.prototype.matchVelocity = function(boids) {
    vec3.set(this.steer, 0, 0, 0);
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
        var boid = boids[i];
        if (boid == this) {
            continue;
        }

        vec3.subtract(this.diff, this.position, boid.position);
        var distance = vec3.length(this.diff);
        if (distance > this.matchDistance) {
            continue;
        }

        vec3.add(this.steer, this.steer, boid.velocity);
        count += 1;
    }

    if (count == 0) {
        return;
    }

    vec3.scale(this.steer, this.steer, 1 / count);
    this.doSteer(this.matchWeight);
};

Boid.prototype.moveToCenter = function(boids) {
    vec3.set(this.sum, 0, 0, 0);
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
        var boid = boids[i];
        if (boid == this) {
            continue;
        }

        vec3.subtract(this.diff, this.position, boid.position);
        var distance = vec3.length(this.diff);
        if (distance > this.centerDistance) {
            continue;
        }

        vec3.add(this.sum, this.sum, boid.position);
        count += 1;
    }

    if (count == 0) {
        return;
    }

    vec3.scale(this.sum, this.sum, 1 / count);
    vec3.set(this.steer, 0, 0, 0);
    vec3.subtract(this.steer, this.sum, this.position);

    this.doSteer(this.centerWeight);
};

Boid.prototype.doSteer = function(weight) {
    if (vec3.squaredLength(this.steer) == 0) {
        return;
    }

    vec3.normalize(this.steer, this.steer);
    vec3.scale(this.steer, this.steer, this.maxVel);
    vec3.subtract(this.steer, this.steer, this.velocity);
    vec3.limit(this.steer, this.steer, this.maxForce);
    vec3.scale(this.steer, this.steer, weight);
    vec3.add(this.acceleration, this.acceleration, this.steer);
};

module.exports = Boid;
