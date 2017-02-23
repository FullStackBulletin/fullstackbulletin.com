import sass from 'node-sass';
import hexToRgb from './hexToRgb';

const getPaletteFromSass = palettes => name => {
  // Get the variable name from sass function (when it is invoked)
  // Take the palette with the given name from object palettes
  const palette = palettes[name.getValue()];
  // Get all key from the palette
  const keys = Object.keys(palette);
  // Create a sass Map object
  const map = sass.types.Map(keys.length);
  // Get the Sass Color class
  const ColorClass = sass.types.Color;
  // Iterate every key
  let convertedColor;
  keys.forEach((key, i) => {
    // Convert the value of the given key on the object palette into rgb format
    convertedColor = hexToRgb(palette[key]);
    // Set the key value in the sass Map
    map.setKey(i, sass.types.String(key));
    map.setValue(i, new ColorClass(convertedColor.r, convertedColor.g, convertedColor.b));
  });
  return map;
};

module.exports = getPaletteFromSass;