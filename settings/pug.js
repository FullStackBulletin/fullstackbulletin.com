var data = require('./../dist/data.json');
data.navigation = [
  {label: 'Logo', url: '#logo'},
  {label: 'Palettes', url: '#palettes'},
  {label: 'Typography', url: '#typography'}
];
data.palettes = require('./palette');
data.typography = require('./typography');
module.exports = data;
