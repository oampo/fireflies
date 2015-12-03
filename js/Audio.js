var AudioContext = new Class({
    initialize: function() {
        this.destination = new AudioDestination(this);
        this.sampleRate = 44100.0;
        this.currentTime = 0;
    }
});

var AudioNode = new Class({
    initialize: function(context, numberOfInputs, numberOfOutputs) {
        this.context = context;
        this.numberOfInputs = numberOfInputs;
        this.numberOfOutputs = numberOfOutputs;

        this.inputs = [];
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            this.inputs.push(new Input(this, i));
        }

        this.outputs = [];
        var numberOfOutputs = this.numberOfOutputs;
        for (var i = 0; i < numberOfOutputs; i++) {
            this.outputs.push(new Output(this, i));
        }
    },

    connect: function(node, output, input) {
        var outputPin = this.outputs[output || 0];
        var inputPin = node.inputs[input || 0];
        outputPin.connect(inputPin);
        inputPin.connect(outputPin);
    },

    disconnect: function(output) {
        var outputPin = this.outputs[output || 0];
        while (outputPin.connectedTo.length) {
            var inputPin = outputPin.connectedTo.pop();
            inputPin.disconnect(outputPin);
            outputPin.disconnect(inputPin);
        }
    },

    tick: function(length) {
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];
            var numberOfStreams = input.connectedFrom.length;
            for (var j = 0; j < numberOfStreams; j++) {
                input.connectedFrom[j].node.tick(length);
            }
        }
    }
});

var Input = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedFrom = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioBuffer(2, 1, node.context.sampleRate);
    },

    connect: function(output) {
        this.connectedFrom.push(output);
    },

    disconnect: function(output) {
        var numberOfStreams = this.connectedFrom.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (output == this.connectedFrom[i]) {
                this.connectedFrom.splice(i, 1);
                break;
            }
        }
    }
});

var Output = new Class({
    initialize: function(node, index) {
        this.node = node;
        this.index = index;
        this.connectedTo = [];
        // Minimum sized buffer, which we can resize from accordingly
        this.buffer = new AudioBuffer(2, 1, node.context.sampleRate);
    },

    connect: function(input) {
        this.connectedTo.push(input);
    },

    disconnect: function(input) {
        var numberOfStreams = this.connectedTo.length;
        for (var i = 0; i < numberOfStreams; i++) {
            if (input == this.connectedTo[i]) {
                this.connectedTo.splice(i, 1);
                break;
            }
        }
    }
});

var AudioBuffer = new Class({
    initialize: function(numberOfChannels, length, sampleRate) {
        this.numberOfChannels = numberOfChannels;
        this.sampleRate = sampleRate;
        this.length = length;

        this.duration = this.length / this.sampleRate;

        this.data = new Float32Array(numberOfChannels * length);
        this.unsliced_data = this.data;
    },

    getChannelData: function(channel) {
        return (this.data.slice(channel * this.length,
                               (channel + 1) * this.length));
    },

    add: function(buffer) {
        var length = this.length;
        var numberOfChannels = buffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var channel1 = this.getChannelData(i);
            var channel2 = buffer.getChannelData(i);
            for (var j = 0; j < length; j++) {
                channel1[j] += channel2[j];
            }
        }
    },

    resize: function(numberOfChannels, length) {
        if (numberOfChannels * length > this.unsliced_data.length) {
            this.data = new Float32Array(numberOfChannels * length);
            this.unsliced_data = this.data;
        }
        else {
            this.data = this.unsliced_data.slice(0, numberOfChannels * length);
        }
        this.numberOfChannels = numberOfChannels;
        this.length = length;
    },

    interleave: function() {
        var interleaved = new Float32Array(this.numberOfChannels * this.length);
        var leftChannel = this.getChannelData(0);
        var rightChannel = this.getChannelData(1);
        var length = this.length;
        for (var i = 0; i < length; i++) {
            interleaved[2 * i] = leftChannel[i];
            interleaved[2 * i + 1] = rightChannel[i];
        }
        this.data = interleaved;
    }
});

var JavaScriptAudioNode = new Class({
    Extends: AudioNode,
    initialize: function(context, numberOfInputs, numberOfOutputs) {
        AudioNode.prototype.initialize.apply(this, [context, numberOfInputs,
                                                    numberOfOutputs]);
        this.event = {};
        this.event.node = this;
    },

    onprocessaudio: function(event) {
    },

    tick: function(length) {
        AudioNode.prototype.tick.apply(this, [length]);
        // Make event local
        var event = this.event;
        event.inputBuffer = [];
        event.outputBuffer = [];
        event.playbackTime = this.context.currentTime; // FIXME
        this.createInputBuffers(event, length);
        this.createOutputBuffers(event, length);
        this.onprocessaudio(event);
    },

    createInputBuffers: function(event, length) {
        var numberOfInputs = this.numberOfInputs;
        for (var i = 0; i < numberOfInputs; i++) {
            var input = this.inputs[i];

            var numberOfStreams = input.connectedFrom.length;
            if (numberOfStreams) {
                // We have connections
                var inputBuffer = input.connectedFrom[0].buffer;

                // Sum the other inputs
                for (var j = 1; j < numberOfStreams; j++) {
                    var output = input.connectedFrom[j];
                    var outputBuffer = output.buffer;
                    inputBuffer.add(outputBuffer);
                }
            }
            else {
                // If we don't have any connections give a single silent channel
                inputBuffer.resize(2, length);
            }
            event.inputBuffer.push(inputBuffer);
        }
    },

    createOutputBuffers: function(event, length) {
        // Create the output buffers
        var numberOfOutputs = this.numberOfOutputs;
        for (var i = 0; i < numberOfOutputs; i++) {
            var output = this.outputs[i];
            output.buffer.resize(2, length);
            event.outputBuffer.push(output.buffer);
        }
    }
});

var Parameters = new Class({
    initParameters: function() {
        this.parameterChanges = {};
    },

    setParameter: function(parameterName, value) {
        if (!this.parameterChanges[parameterName]) {
            this.parameterChanges[parameterName] = [];
        }
        var parameterChange = {'value': value,
                               'time': this.context.currentTime};
        this.parameterChanges[parameterName].push(parameterChange);
    }
});

var AudioDestination = new Class({
    Extends: JavaScriptAudioNode,
    initialize: function(context) {
        JavaScriptAudioNode.prototype.initialize.apply(this, [context, 1, 0]);
    },

    onprocessaudio: function(event) {
        this.buffer = event.inputBuffer[0];
    }
});

var Sine = new Class({
    Extends: JavaScriptAudioNode,
    Implements: Parameters,
    initialize: function(context) {
        JavaScriptAudioNode.prototype.initialize.apply(this, [context, 0, 1]);
        this.initParameters();
        this.phase = 0;
        this.frequency = 400;
    },

    onprocessaudio: function(event) {
        var buffer = event.outputBuffer[0];
        var channel = buffer.getChannelData(0);

        // The time when the previous buffer was dispatched
        var startTime = this.context.currentTime - buffer.length;

        // Make frequency change variables loca(l
        var frequencyChanges = this.parameterChanges['frequency'];
        var freqeuncyChange, frequencyChangeTime;
        if (frequencyChanges && frequencyChanges.length) {
            frequencyChange = frequencyChanges.shift();
            frequencyChangeTime = frequencyChange.time;
        }

        // Make processing variables local
        var sampleRate = this.context.sampleRate;
        var tableSize = Sine.TABLE.length;
        var phase = this.phase;
        var frequency = this.frequency;

        // Processing loop
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (frequencyChange && startTime + i >= frequencyChangeTime) {
                frequency = frequencyChange.value;
                frequencyChange = frequencyChanges.shift();
                if (frequencyChange) {
                    frequencyChangeTime = frequencyChange.time;
                }
            }
            var step = frequency * tableSize / sampleRate;
            phase += step;
            phase &= tableSize - 1; // this.phase %= tableSize
            channel[i] = Sine.TABLE[Math.floor(phase)];
        }
        this.phase = phase;
        this.frequency = frequency;
    }
});

Sine.TABLE = [];
for (var i = 0; i < 2048; i++) {
    Sine.TABLE.push(Math.sin(i * 2 * Math.PI / 2048));
}

var Gain = new Class({
    Extends: JavaScriptAudioNode,
    Implements: Parameters,
    initialize: function(context) {
        JavaScriptAudioNode.prototype.initialize.apply(this, [context, 1, 1]);
        this.initParameters();
        this.gain = 1;
    },

    onprocessaudio: function(event) {
        var inputBuffer = event.inputBuffer[0];
        var outputBuffer = event.outputBuffer[0];

        var startTime = this.context.currentTime - inputBuffer.length;

        var gainChanges = this.parameterChanges['gain'];
        var gainChange, gainChangeTime;
        if (gainChanges && gainChanges.length) {
            gainChange = gainChanges.shift();
            gainChangeTime = gainChange.time;
        }

        // Local processing variables
        var gain = this.gain;


        var numberOfChannels = inputBuffer.numberOfChannels;
        for (var i = 0; i < numberOfChannels; i++) {
            var inputChannel = inputBuffer.getChannelData(i);
            var outputChannel = outputBuffer.getChannelData(i);
            var bufferLength = inputBuffer.length;
            for (var j = 0; j < bufferLength; j++) {
                if (gainChange && startTime + j >= gainChangeTime) {
                    gain = gainChange.value;
                    gainChange = gainChanges.shift();
                    if (gainChange) {
                        gainChangeTime = gainChange.time;
                    }
                }
                outputChannel[j] = inputChannel[j] * gain;
            }
        }
        this.gain = gain;
    }
});

var Pan2 = new Class({
    Extends: JavaScriptAudioNode,
    Implements: Parameters,
    initialize: function(context) {
        JavaScriptAudioNode.prototype.initialize.apply(this, [context, 1, 1]);
        this.initParameters();
        this.pan = 0.5;
    },

    onprocessaudio: function(event) {
        var inputBuffer = event.inputBuffer[0];
        var outputBuffer = event.outputBuffer[0];
        var inputChannel = inputBuffer.getChannelData(0);
        var leftOutputChannel = outputBuffer.getChannelData(0);
        var rightOutputChannel = outputBuffer.getChannelData(1);

        var startTime = this.context.currentTime - inputBuffer.length;

        var panChanges = this.parameterChanges['pan'];
        var panChange, panChangeTime;
        if (panChanges && panChanges.length) {
            panChange = panChanges.shift();
            panChangeTime = panChange.time;
        }

        // Local processing variables
        var pan = this.pan;
        var leftGain = Math.cos(pan * Math.PI / 2);
        var rightGain = Math.sin(pan * Math.PI / 2);

        var bufferLength = outputBuffer.length;
        for (var i = 0; i < bufferLength; i++) {
            if (panChange && startTime + i >= panChangeTime) {
                pan = panChange.value;
                leftGain = Math.cos(pan * Math.PI / 2);
                rightGain = Math.sin(pan * Math.PI / 2);
                panChange = panChanges.shift();
                if (panChange) {
                    panChangeTime = panChange.time;
                }
            }

            var value = inputChannel[i];
            leftOutputChannel[i] = value * leftGain;
            rightOutputChannel[i] = value * rightGain;
        }
        this.pan = pan;
    }
});
