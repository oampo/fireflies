window.addEvent('domready', function() {
    // Monkey patch in a limit function for vec3
    vec3.limit = function(vec, mag, dest) {
        if (!dest || vec == dest) {
            if (vec3.length(vec) > mag) {
                vec3.normalize(vec);
                vec3.scale(vec, mag);
            }
            return (vec);
        }
        vec3.set(vec, dest);
        if (vec3.length(dest) > mag) {
            vec3.normalize(dest);
            vec3.scale(dest, mag);
        }
        return (dest);
    };

    var Boid = new Class({
        initialize: function(maxPosition) {
            this.maxPosition = maxPosition;
            this.maxVel = 10;
            this.maxForce = 0.2;

            this.position = vec3.create();
            vec3.set([Math.random() * this.maxPosition[0],
                      Math.random() * this.maxPosition[1],
                      Math.random() * this.maxPosition[2]],
                     this.position);

            this.velocity = vec3.create();
            vec3.set([Math.random() * 2 - 1,
                      Math.random() * 2 - 1,
                      Math.random() * 2 - 1], this.velocity);
            // Max velocity magnitude of 1
            vec3.scale(this.velocity, 1.0 / Math.sqrt(3));
            vec3.scale(this.velocity, this.maxVel);

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
        },

        update: function(boids) {
            this.avoid(boids);
            this.matchVelocity(boids);
            this.moveToCenter(boids);
            vec3.add(this.velocity, this.acceleration);
            vec3.limit(this.velocity, this.maxVel);
            vec3.add(this.position, this.velocity);
            vec3.set([0, 0, 0], this.acceleration);
        },

        avoid: function(boids) {
            vec3.set([0, 0, 0], this.steer);
            var count = 0;
            for (var i = 0; i < boids.length; i++) {
                var boid = boids[i];
                vec3.subtract(this.position, boid.position, this.diff);
                var distance = vec3.length(this.diff);
                if (distance < this.avoidDistance && boid != this) {
                    vec3.normalize(this.diff);
                    vec3.scale(this.diff, 1 / distance);
                    vec3.add(this.steer, this.diff);
                    count += 1;
                }
            }
            if (count > 0) {
                vec3.scale(this.steer, 1 / count);
            }

            if (vec3.length(this.steer) > 0) {
                vec3.normalize(this.steer);
                vec3.scale(this.steer, this.maxVel);
                vec3.subtract(this.steer, this.velocity);
                vec3.limit(this.steer, this.maxForce);
            }
            vec3.scale(this.steer, this.avoidWeight);
            vec3.add(this.acceleration, this.steer);
        },

        matchVelocity: function(boids) {
            vec3.set([0, 0, 0], this.steer);
            var count = 0;
            for (var i = 0; i < boids.length; i++) {
                var boid = boids[i];
                vec3.subtract(this.position, boid.position, this.diff);
                var distance = vec3.length(this.diff);
                if (distance < this.matchDistance && boid != this) {
                    vec3.add(this.steer, boid.velocity);
                    count += 1;
                }
            }

            if (count > 0) {
                vec3.scale(this.steer, 1 / count);
            }

            if (vec3.length(this.steer) > 0) {
                vec3.normalize(this.steer);
                vec3.scale(this.steer, this.maxVel);
                vec3.subtract(this.steer, this.velocity);
                vec3.limit(this.steer, this.maxForce);
            }
            vec3.scale(this.steer, this.matchWeight);
            vec3.add(this.acceleration, this.steer);
        },

        moveToCenter: function(boids) {
            vec3.set([0, 0, 0], this.sum);
            var count = 0;
            for (var i = 0; i < boids.length; i++) {
                var boid = boids[i];
                vec3.subtract(this.position, boid.position, this.diff);
                var distance = vec3.length(this.diff);
                if (distance < this.centerDistance && boid != this) {
                    vec3.add(this.sum, boid.position);
                    count += 1;
                }
            }

            if (count > 0) {
                vec3.scale(this.sum, 1 / count);
                vec3.set([0, 0, 0], this.steer);
                vec3.subtract(this.sum, this.position, this.steer);
                vec3.normalize(this.steer);
                vec3.scale(this.steer, this.maxVel);
                vec3.subtract(this.steer, this.velocity);
                vec3.limit(this.steer, this.maxForce);
                vec3.scale(this.steer, this.centerWeight);
                vec3.add(this.acceleration, this.steer);
            }
        }
    });


    var Flock = new Class({
        initialize: function(numBoids, maxPosition) {
            this.numBoids = numBoids;
            this.maxPosition = maxPosition;
            this.createBoids();
            this.createMesh();
        },

        createBoids: function() {
            this.boids = [];
            for (var i = 0; i < this.numBoids; i++) {
                this.boids.push(new Boid(this.maxPosition));
            }
        },

        createMesh: function() {
            this.mesh = new Mesh((this.numBoids - 1) * 6, gl.TRIANGLES,
                                 gl.STREAM_DRAW, gl.STATIC_DRAW,
                                 null, gl.STATIC_DRAW);
        },

        update: function() {
            var vertices = [];
            var texCoords = [];
            var colors = [];
            for (var i = 0; i < this.boids.length; i++) {
                var boid = this.boids[i];
                boid.update(this.boids);
                if (i != 0) {
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
            }
            this.mesh.vertexBuffer.setValues(vertices);
            this.mesh.texCoordBuffer.setValues(texCoords);
            this.mesh.colorBuffer.setValues(colors);
        }
    });

    var Fireflies = new Class({
        Extends: App,
        Implements: [AudioOutput, MouseEvents],
        initialize: function(element, options) {
            App.prototype.initialize.apply(this, [element, options]);

            // Create info links, which can be accessed even if there is no
            // WebGL
            this.createInfoLinks();

            if (!gl) {
                $('controls').setStyle('display', 'none');
                return;
            }
            this.createFlock();

            this.setBlending();

            this.createRenderers();

            this.createCachedVectors();

            this.createAudio();
        },

        createFlock: function() {
            var maxPosition = [this.options.width, this.options.height,
                               (this.options.width + this.options.height) / 2];
            this.flock = new Flock(15, maxPosition);
        },

        setBlending: function() {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        },

        createRenderers: function() {
            // For rendering to the framebuffer
            this.flockRenderer = new FramebufferRenderer(this.options.width,
                                                         this.options.height,
                                                         'point-sprite-vert',
                                                         'point-sprite-frag');

            this.projectionMatrix = mat4.create();
            mat4.perspective(60, this.options.width / this.options.height,
                             0.000001, 10000, this.projectionMatrix);
            this.flockRenderer.setUniform('uProjectionMatrix',
                                          this.projectionMatrix);

            this.modelviewMatrix = mat4.create();

            this.litTexture = new Texture(720, 720);
            this.litTexture.load('lit.png');

            // For downsampling and blurring the texture
            this.blurRenderers = [];
            this.blurMeshes = [];
            this.blurProjectionMatrices = [];
            this.blurModelviewMatrix = mat4.create();
            mat4.identity(this.blurModelviewMatrix);

            for (var i = 0; i < 3; i++) {
                var width = this.options.width / Math.pow(2, i + 1);
                var height = this.options.height / Math.pow(2, i + 1);
                this.blurRenderers.push(new FramebufferRenderer(width, height,
                                                               'texture-vert',
                                                               'blur-frag'));

                this.blurRenderers[i].setUniform('uOffset', [1 / width,
                                                             1 / height]);

                this.blurMeshes.push(new RectMesh(width, height,
                                                  gl.STATIC_DRAW, null,
                                                  null, gl.STATIC_DRAW));

                this.blurProjectionMatrices.push(mat4.create());
                mat4.ortho(0, width, height, 0, -1, 1,
                           this.blurProjectionMatrices[i]);
                this.blurRenderers[i].setUniform('uProjectionMatrix',
                                                this.blurProjectionMatrices[i]);
                this.blurRenderers[i].setUniform('uModelviewMatrix',
                                                 this.blurModelviewMatrix);
            }

            // For blending the texture
            this.blendRenderer = new BasicRenderer('texture-vert',
                                                   'blend-frag');
            for (var i = 0; i < this.blurRenderers.length; i++) {
                this.blendRenderer.setUniform('uSampler' + i, i);
            }

            this.orthoProjectionMatrix = mat4.create();
            mat4.ortho(0, this.options.width, this.options.height, 0, -1, 1,
                       this.orthoProjectionMatrix);
            this.blendRenderer.setUniform('uProjectionMatrix',
                                          this.orthoProjectionMatrix);

            this.orthoModelviewMatrix = mat4.create();
            mat4.identity(this.orthoModelviewMatrix);
            this.blendRenderer.setUniform('uModelviewMatrix',
                                          this.orthoModelviewMatrix);

            this.textureMesh = new RectMesh(this.options.width,
                                            this.options.height,
                                            gl.STATIC_DRAW, null,
                                            null, gl.STATIC_DRAW);
        },

        createCachedVectors: function() {
            this.target = vec3.create();
            this.eye = vec3.create();
        },

        createInfoLinks: function() {
            $('about-link').addEvents({
                'mouseover': function(event) {
                    $('about').setStyle('display', 'inline');
                },
                'mouseout': function(event) {
                    $('about').setStyle('display', 'none');
                }
            });

            $('tips-link').addEvents({
                'mouseover': function(event) {
                    $('tips').setStyle('display', 'inline');
                },
                'mouseout': function(event) {
                    $('tips').setStyle('display', 'none');
                }
            });
        },

        createButtons: function() {
            $('reset').addEvent('click', function(event) {
                this.flock.createBoids();
            }.bind(this));

            $('smaller-buffer').addEvent('click', function(event) {
                this.bufferSize /= 2;
            }.bind(this));

            $('larger-buffer').addEvent('click', function(event) {
                this.bufferSize *= 2;
            }.bind(this));

            /*

            $('more-fireflies').addEvent('click', function(event) {
                for (var i=0; i<5; i++) {
                    var boid = new Boid(this.flock.maxPosition);
                    vec3.set(this.flock.boids[0].position, boid.position);
                    vec3.add(boid.position,
                             [Math.random() * this.flock.maxPosition[0],
                              Math.random() * this.flock.maxPosition[1],
                              Math.random() * this.flock.maxPosition[2]]);
                    this.flock.boids.push(boid);

                    var osc = new Sine(this.context);
                    var gain = new Gain(this.context);
                    gain.gain = 0;
                    var pan = new Pan2(this.context);
                    osc.connect(gain);
                    gain.connect(pan);
                    pan.connect(this.gain);
                    this.oscillators.push(osc);
                    this.gains.push(gain);
                    this.pans.push(pan);
                };
                this.flock.numBoids += 5;
                this.flock.createMesh();
                this.maxAmp = 1 / (this.flock.boids.length - 1);
            }.bind(this));

            $('less-fireflies').addEvent('click', function(event) {
                var numBoids = this.flock.boids.length;
                if (numBoids > 5) {
                    for (var i=0; i<5; i++) {
                        this.oscillators[numBoids - 2 - i].disconnect();
                        this.gains[numBoids - 2 - i].disconnect();
                        this.pans[numBoids - 2 -i].disconnect();
                    }
                    numBoids -= 5;
                    this.flock.boids = this.flock.boids.slice(0, numBoids);
                    this.flock.numBoids = numBoids;
                    this.flock.createMesh();

                    this.oscillators = this.oscillators.slice(0, numBoids - 1);
                    this.gains = this.gains.slice(0, numBoids - 1);
                    this.pans = this.pans.slice(0, numBoids - 1);
                }
                this.maxAmp = 1 / (this.flock.boids.length - 1);
            }.bind(this));

            */
        },

        createSliders: function() {
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
        },

        createVolumeSlider: function() {
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
        },

        createAudio: function() {
            this.initAudioOutput(2, 1 << 16);
            this.context = new AudioContext();
            this.ampScale = 400;
            this.maxAmp = 1 / (this.flock.boids.length - 1);
            this.scale = [1, 1.0594630943591, 1.1892071150019,
                          1.3348398541685, 1.4983070768743, 1.5874010519653,
                          1.7817974362766];

            this.oscillators = [];
            this.gains = [];
            this.pans = [];
            this.gain = new Gain(this.context);
            this.gain.connect(this.context.destination);

            for (var i = 0; i < this.flock.boids.length - 1; i++) {
                var osc = new Sine(this.context);
                var gain = new Gain(this.context);
                var pan = new Pan2(this.context);
                gain.gain = 0;
                osc.connect(gain);
                gain.connect(pan);
                pan.connect(this.gain);
                this.oscillators[i] = osc;
                this.gains[i] = gain;
                this.pans[i] = pan;
            }
        },

        draw: function() {
            // This is an almighty cludge.  Don't like...
            // The sliders work out their position using Element.offsetWidth,
            // but this value changes when the canvas element is inserted.  If
            // this code is in init we have a race condition, where the
            // sliders only work if the canvas has already been inserted.
            // Instead we create the sliders on the first draw loop, and pray.
            if (this.frameCount == 1) {
                // Other GUI elements
                this.createSliders();
                this.createButtons();
                this.createVolumeSlider();

                if (!this.audioEnabled) {
                    $('volume').setStyle('visibility', 'hidden');
                    $('audio-buffer').setStyle('visibility', 'hidden');
                }
            }
            this.flock.update();
            this.setCamera();
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

                renderer.render(this.blurMeshes[i], [0, 0, this.options.width,
                                                     this.options.height]);

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

            // Update the boid's audio stores
            for (var i = 1; i < this.flock.boids.length; i++) {
                var boid = this.flock.boids[i];

                // Convert boid position to eye space
                // TODO: Cache me
                var eyeSpacePosition = vec3.create();
                mat4.multiplyVec3(this.modelviewMatrix, boid.position,
                                  eyeSpacePosition);


                // Spherical polars
                var r = vec3.length(eyeSpacePosition);
                var theta = Math.acos(eyeSpacePosition[2] / r);
                var phi = Math.atan2(eyeSpacePosition[0], eyeSpacePosition[2]);

                // Set amplitude
                var amp = this.ampScale / (r * r);
                if (amp > this.maxAmp) {
                    amp = this.maxAmp;
                }
                this.gains[i - 1].setParameter('gain', amp);

                // Set frequency
                var degree = Math.floor(Math.exp(theta) * 1.05);
                var octave = Math.floor(degree / this.scale.length);
                degree %= this.scale.length;
                var freq = this.scale[degree] * Math.pow(2, octave) * 50;
                this.oscillators[i - 1].setParameter('frequency', freq);

                var pan = (Math.sin(phi) + 1) / 2;
                this.pans[i - 1].setParameter('pan', pan);
            }

            // Tick the audio output
            this.context.currentTime = this.output.mozCurrentSampleOffset();
            this.tickAudioOutput();
        },

        setCamera: function() {
            vec3.set(this.flock.boids[0].position, this.eye);

            vec3.set([0, 0, 0], this.target);
            for (var i = 0; i < this.flock.boids.length; i++) {
                var boid = this.flock.boids[i];
                vec3.add(this.target, boid.position);
            }
            vec3.scale(this.target, 1 / this.flock.boids.length);
            mat4.lookAt(this.eye, this.target, [0, 1, 0],
                        this.modelviewMatrix);
            this.flockRenderer.setUniform('uModelviewMatrix',
                                          this.modelviewMatrix);
            this.flockRenderer.setUniform('uCameraPosition',
                                          this.flock.boids[0].position);
        },

        audioRequested: function(samplesNeeded) {
            this.context.destination.tick(samplesNeeded);
            this.context.destination.buffer.interleave();
            return this.context.destination.buffer.data;
        },

        mouseMoved: function(mouseX, mouseY) {
            if (this.mouseXSlider) {
                // Scale 0-100
                var value = 100 * mouseX / this.options.width;
                this.mouseXSlider.set(value);
            }
            if (this.mouseYSlider) {
                // Scale 0-100
                var value = 100 * mouseY / this.options.height;
                this.mouseYSlider.set(value);
            }
        }
    });

    window.app = new Fireflies($('webgl'), {width: 960, height: 600,
                                            debug: false});
    if (gl) {
        window.app.run();
    }
});
