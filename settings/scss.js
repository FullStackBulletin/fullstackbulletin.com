var palettes = require('./palette');
var sass = require('node-sass');

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
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
    keys.forEach((key, i) => {
      // Convert the value of the given key on the object palette into rgb format
      var convertedColor = hexToRgb(palette[key]);
      // Create a new Sass color instance
      var color = new ColorClass(convertedColor.r, convertedColor.g, convertedColor.b);
      // Set the key value in the sass Map
      map.setKey(i, sass.types.String(paletteName + '-' + key));
      map.setValue(i, color);
    });
    return map;
  }
};
