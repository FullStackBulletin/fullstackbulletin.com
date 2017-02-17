var palettes = require('./palette');
var typography = require('./typography');
var sass = require('node-sass');
var sassUtils = require('node-sass-utils')(sass);

function hexToRgb(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('Expected a string');
  }
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  var num = parseInt(hex, 16);
  return { r: num >> 16, g: num >> 8 & 255, b: num & 255};
}

module.exports = {
  'get-palette($name)': function(name) {
    // Get the variable name from sass function (when it is invoked)
    // For that we need to take its value before
    var paletteName = name.getValue();
    // Take the palette with the given name from object palettes
    var palette = palettes[paletteName];
    // Get all key from the palette
    var keys = Object.keys(palette);
    // Create a sass Map object
    var map = sass.types.Map(keys.length);
    // Get the Sass Color class
    var ColorClass = sass.types.Color;
    // Iterate every key
    var convertedColor;
    keys.forEach(function(key, i) {
      // Convert the value of the given key on the object palette into rgb format
      convertedColor = hexToRgb(palette[key]);
      // Create a new Sass color instance
      var color = new ColorClass(convertedColor.r, convertedColor.g, convertedColor.b);
      // Set the key value in the sass Map
      map.setKey(i, sass.types.String(key));
      map.setValue(i, color);
    });
    return map;
  },
  'get-typography': function(name) {
    return sassUtils.castToSass(typography);
  },
  'get-type($name)': function(name) {
    return sassUtils.castToSass(typography[name.getValue()]);
  }
};
