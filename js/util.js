var vec3 = require('gl-matrix').vec3;

vec3.limit = function(dest, vec, mag) {
    vec3.copy(dest, vec);
    if (vec3.length(dest) > mag) {
        vec3.normalize(dest, dest);
        vec3.scale(dest, dest, mag);
    }
    return vec;
};

vec3.toPolar = function(dest, vec) {
    var r = dest[0] = vec3.length(vec);
    dest[1] = Math.acos(vec[2] / r);
    dest[2] = Math.atan2(vec[0], vec[2]);
};
