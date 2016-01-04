var Boid = require('./boid');

var UI = function(app) {
    this.app = app;

    this.createButtons();
    this.createSliders();
    this.createVolumeSlider();

    this.app.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
};

UI.prototype.createButtons = function() {
    var button = document.getElementById('fireflies-reposition');
    button.addEventListener('click', function(event) {
        this.app.flock.reset();
    }.bind(this));
};

UI.prototype.createSliders = function() {
    this.controls = [
        {
            x: document.getElementById('attract-x'),
            y: document.getElementById('attract-y'),
            variable: 'centerWeight',
            slider: document.getElementById('attract-slider'),
            initialValue: Boid.INITIAL_CENTER_WEIGHT / 2
        }, {
            x: document.getElementById('repel-x'),
            y: document.getElementById('repel-y'),
            variable: 'avoidWeight',
            slider: document.getElementById('repel-slider'),
            initialValue: Boid.INITIAL_AVOID_WEIGHT / 2
        },
        {
            x: document.getElementById('match-x'),
            y: document.getElementById('match-y'),
            variable: 'matchWeight',
            slider: document.getElementById('match-slider'),
            initialValue: Boid.INITIAL_MATCH_WEIGHT / 2
        }
    ];

    for (var i = 0; i < this.controls.length; i++) {
        var control = this.controls[i];
        control.slider.value = control.initialValue;
        control.slider.addEventListener('change', function(control) {
            this.app.flock.setWeight(control.variable,
                                     control.slider.value * 2);
        }.bind(this, control));

        // Create x buttons
        control.x.addEventListener('change', function(control) {
            if (this.mouseXSlider == control.slider) {
                // Turning off control
                this.mouseXSlider = null;
                return;
            }

            this.mouseXSlider = control.slider;

            // Uncheck all of the others
            for (var j=0; j<this.controls.length; j++) {
                var other = this.controls[j];
                if (control == other) {
                    continue;
                }

                other.x.checked = false;
            }
        }.bind(this, control));

        control.y.addEventListener('change', function(control) {
            if (this.mouseYSlider == control.slider) {
                // Turning off control
                this.mouseYSlider = null;
                return;
            }

            this.mouseYSlider = control.slider;

            // Uncheck all of the others
            for (var j=0; j<this.controls.length; j++) {
                var other = this.controls[j];
                if (control == other) {
                    continue;
                }

                other.y.checked = false;
            }
        }.bind(this, control));
    }
};

UI.prototype.createVolumeSlider = function() {
    var slider = document.getElementById('volume-slider');
    slider.addEventListener('change', function(event) {
        this.app.audioGain.gain.value = event.target.value;
    }.bind(this));
};

UI.prototype.onMouseMove = function(event) {
    var canvasPosition = this.app.getCanvasPosition();
    if (this.mouseXSlider) {
        var xPosition = event.pageX - canvasPosition[0];
        xPosition /= this.app.canvas.width;
        this.mouseXSlider.value = xPosition;
    }

    if (this.mouseYSlider) {
        var yPosition = event.pageY - canvasPosition[1];
        yPosition /= this.app.canvas.height;
        this.mouseYSlider.value = yPosition;
    }
};

module.exports = UI;
