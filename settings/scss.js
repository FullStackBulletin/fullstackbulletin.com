var palettes = require('./palettes');
var typography = require('./typography');
var getPaletteFromSass = require('./../build-utilities/compiled/getPaletteFromSass');
var typographyUtils = require('./../build-utilities/compiled/typography');

module.exports = {
  'get-palette($name)': getPaletteFromSass(palettes),
  'get-typography': typographyUtils.getTypography(typography),
  'get-type($name)': typographyUtils.getType(typography)
};

