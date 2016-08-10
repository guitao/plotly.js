/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var tinycolor = require('tinycolor2');
var isNumeric = require('fast-isnumeric');

var color = module.exports = {};

var colorAttrs = require('./attributes');
color.defaults = colorAttrs.defaults;
color.defaultLine = colorAttrs.defaultLine;
color.lightLine = colorAttrs.lightLine;
color.background = colorAttrs.background;

color.tinyRGB = function(tc) {
    var c = tc.toRgb();
    return 'rgb(' + Math.round(c.r) + ', ' +
        Math.round(c.g) + ', ' + Math.round(c.b) + ')';
};

color.rgb = function(cstr) { return color.tinyRGB(tinycolor(cstr)); };

color.opacity = function(cstr) { return cstr ? tinycolor(cstr).getAlpha() : 0; };

color.addOpacity = function(cstr, op) {
    var c = tinycolor(cstr).toRgb();
    return 'rgba(' + Math.round(c.r) + ', ' +
        Math.round(c.g) + ', ' + Math.round(c.b) + ', ' + op + ')';
};

// combine two colors into one apparent color
// if back has transparency or is missing,
// color.background is assumed behind it
color.combine = function(front, back) {
    var fc = tinycolor(front).toRgb();
    if(fc.a === 1) return tinycolor(front).toRgbString();

    var bc = tinycolor(back || color.background).toRgb(),
        bcflat = bc.a === 1 ? bc : {
            r: 255 * (1 - bc.a) + bc.r * bc.a,
            g: 255 * (1 - bc.a) + bc.g * bc.a,
            b: 255 * (1 - bc.a) + bc.b * bc.a
        },
        fcflat = {
            r: bcflat.r * (1 - fc.a) + fc.r * fc.a,
            g: bcflat.g * (1 - fc.a) + fc.g * fc.a,
            b: bcflat.b * (1 - fc.a) + fc.b * fc.a
        };
    return tinycolor(fcflat).toRgbString();
};

color.contrast = function(cstr, lightAmount, darkAmount) {
    var tc = tinycolor(cstr);

    var newColor = tc.isLight() ?
        tc.darken(darkAmount) :
        tc.lighten(lightAmount);

    return newColor.toString();
};

color.stroke = function(s, c) {
    var tc = tinycolor(c);
    s.styles({'stroke': color.tinyRGB(tc), 'stroke-opacity': tc.getAlpha()});
};

color.fill = function(s, c) {
    var tc = tinycolor(c);
    s.styles({'fill': color.tinyRGB(tc), 'fill-opacity': tc.getAlpha()});
};

// search container for colors with the deprecated rgb(fractions) format
// and convert them to rgb(0-255 values)
color.clean = function(container) {
    if(!container || typeof container !== 'object') return;

    var keys = Object.keys(container),
        i,
        j,
        key,
        val;

    for(i = 0; i < keys.length; i++) {
        key = keys[i];
        val = container[key];

        // only sanitize keys that end in "color" or "colorscale"
        if(key.substr(key.length - 5) === 'color') {
            if(Array.isArray(val)) {
                for(j = 0; j < val.length; j++) val[j] = cleanOne(val[j]);
            }
            else container[key] = cleanOne(val);
        }
        else if(key.substr(key.length - 10) === 'colorscale' && Array.isArray(val)) {
            // colorscales have the format [[0, color1], [frac, color2], ... [1, colorN]]
            for(j = 0; j < val.length; j++) {
                if(Array.isArray(val[j])) val[j][1] = cleanOne(val[j][1]);
            }
        }
        // recurse into arrays of objects, and plain objects
        else if(Array.isArray(val)) {
            var el0 = val[0];
            if(!Array.isArray(el0) && el0 && typeof el0 === 'object') {
                for(j = 0; j < val.length; j++) color.clean(val[j]);
            }
        }
        else if(val && typeof val === 'object') color.clean(val);
    }
};

function cleanOne(val) {
    if(isNumeric(val) || typeof val !== 'string') return val;

    var valTrim = val.trim();
    if(valTrim.substr(0, 3) !== 'rgb') return val;

    var match = valTrim.match(/^rgba?\s*\(([^()]*)\)$/);
    if(!match) return val;

    var parts = match[1].trim().split(/\s*[\s,]\s*/),
        rgba = valTrim.charAt(3) === 'a' && parts.length === 4;
    if(!rgba && parts.length !== 3) return val;

    for(var i = 0; i < parts.length; i++) {
        if(!parts[i].length) return val;
        parts[i] = Number(parts[i]);

        // all parts must be non-negative numbers
        if(!(parts[i] >= 0)) return val;
        // alpha>1 gets clipped to 1
        if(i === 3) {
            if(parts[i] > 1) parts[i] = 1;
        }
        // r, g, b must be < 1 (ie 1 itself is not allowed)
        else if(parts[i] >= 1) return val;
    }

    var rgbStr = Math.round(parts[0] * 255) + ', ' +
        Math.round(parts[1] * 255) + ', ' +
        Math.round(parts[2] * 255);

    if(rgba) return 'rgba(' + rgbStr + ', ' + parts[3] + ')';
    return 'rgb(' + rgbStr + ')';
}
