var vec3 = require('gl-matrix').vec3;
var rites = require('rites');

var BoidAudio = function(context) {
    this.sine = context.createOscillator();
    this.sine.type = 'sine';
    this.sine.start();

    this.pan = context.createStereoPanner();
    this.gain = context.createGain();
    this.gain.gain.value = 0;

    this.sine.connect(this.pan);
    this.pan.connect(this.gain);
    this.gain.connect(context.destination);
};

BoidAudio.prototype.update = function(position, modelview) {
    var eyeSpacePosition = vec3.create();
    vec3.transformMat4(eyeSpacePosition, position, modelview);
    var polarPosition = vec3.create();
    vec3.toPolar(polarPosition, eyeSpacePosition);

    polarPosition[0] += BoidAudio.BASE_DISTANCE;

    var gain = BoidAudio.AMP_MULTIPLIER / (polarPosition[0] * polarPosition[0]);
    gain = Math.min(gain, BoidAudio.MAX_AMP);
    this.gain.gain.value = gain;

    var degree = Math.floor(Math.exp(polarPosition[1]) * 1.05);
    this.sine.frequency.value = BoidAudio.SCALE.getFrequency(degree,
            BoidAudio.ROOT_FREQUENCY, 0);
    this.pan.pan.value = Math.sin(polarPosition[2]);
}

BoidAudio.MAX_AMP = 1 / 15;
BoidAudio.AMP_MULTIPLIER = 400;
BoidAudio.BASE_DISTANCE = 1;
BoidAudio.SCALE = new rites.scale.Major();
BoidAudio.ROOT_FREQUENCY = 55;

module.exports = BoidAudio;
