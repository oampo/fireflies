var UI = function(app) {
    this.app = app;
};

UI.prototype.createButtons = function() {
    $('reset').addEvent('click', function(event) {
        this.flock.createBoids();
    }.bind(this));
};

// TODO: Wtf...
UI.prototype.createSliders = function() {
    this.initMouseEvents();
    this.mouseXSlider = null;
    this.mouseYSlider = null;

    this.controls = [{'xElement': $('attract-x'),
                     'yElement': $('attract-y'),
                     'variable': 'centerWeight',
                     'sliderDiv': $('attract-slider'),
                     'initialValue': 40},
                    {'xElement': $('repel-x'),
                     'yElement': $('repel-y'),
                     'variable': 'avoidWeight',
                     'sliderDiv': $('repel-slider'),
                     'initialValue': 50},
                    {'xElement': $('match-x'),
                     'yElement': $('match-y'),
                     'variable': 'matchWeight',
                     'sliderDiv': $('match-slider'),
                     'initialValue': 20}];

    for (var i = 0; i < this.controls.length; i++) {
        // Create sliders
        var control = this.controls[i];
        var sliderDiv = control.sliderDiv;
        control.slider = new Slider(sliderDiv,
                                    sliderDiv.getElement('.knob'), {
            initialStep: control.initialValue,
            // Passing control on bind is hacky, but works...
            onChange: function(control, value) {
                // Scale to 0-2
                value = 2 * value / 100;
                for (var i = 0; i < this.flock.boids.length; i++) {
                    this.flock.boids[i][control.variable] = value;
                }
            }.bind(this, control)
        });

        // Create x buttons
        var xElement = control.xElement;
        xElement.addEvent('click', function(event) {
            for (var j = 0; j < this.controls.length; j++) {
                var control = this.controls[j];
                if (control.xElement == event.target) {
                    if (this.mouseXSlider == control.slider) {
                        // Already set so toggle off the control
                        control.xElement.setStyle('color', '#888');
                        this.mouseXSlider = null;
                    }
                    else {
                        // Set the x element
                        control.xElement.setStyle('color', '#FFF');
                        this.mouseXSlider = control.slider;

                        if (this.mouseYSlider == control.slider) {
                            // Unset the Y element
                            control.yElement.setStyle('color', '#888');
                            this.mouseYSlider = null;
                        }
                    }
                }
                else {
                    // Unset the other x elements
                    control.xElement.setStyle('color', '#888');
                }
            }
        }.bind(this));

        // Create y buttons
        var yElement = control.yElement;
        yElement.addEvent('click', function(event) {
            for (var j = 0; j < this.controls.length; j++) {
                var control = this.controls[j];
                if (control.yElement == event.target) {
                    if (this.mouseYSlider == control.slider) {
                        // Already set so toggle off the control
                        control.yElement.setStyle('color', '#888');
                        this.mouseYSlider = null;
                    }
                    else {
                        // Set the y element
                        control.yElement.setStyle('color', '#FFF');
                        this.mouseYSlider = control.slider;

                        // Unset the x element
                        if (this.mouseXSlider == control.slider) {
                            control.xElement.setStyle('color', '#888');
                            this.mouseXSlider = null;
                        }
                    }
                }
                else {
                    // Unset the other y elements
                    control.yElement.setStyle('color', '#888');
                }
            }
        }.bind(this));
    }
};

UI.prototype.createVolumeSlider = function() {
    var sliderDiv = $('volume-slider');
    var slider = new Slider(sliderDiv,
                            sliderDiv.getElement('.knob'), {
        initialStep: 100,
        // Passing control on bind is hacky, but works...
        onChange: function(value) {
            // Scale to 0-1
            value = value / 100;
            this.gain.setParameter('gain', value);
        }.bind(this)
    });
};

UI.prototype.mouseMoved = function(mouseX, mouseY) {
    if (this.mouseXSlider) {
        // Scale 0-100
        var value = 100 * mouseX / this.canvas.width;
        this.mouseXSlider.set(value);
    }
    if (this.mouseYSlider) {
        // Scale 0-100
        var value = 100 * mouseY / this.canvas.height;
        this.mouseYSlider.set(value);
    }
};


