var data = require('./../dist/data.json');
data.navigation = [
  {label: 'Logo', url: '#logo'},
  {label: 'Palettes', url: '#palettes'},
  {label: 'Typography', url: '#typography'},
  {label: 'Icons', url: '#icons'},
  {label: 'Faq', url: '#faq'},
  {label: 'Footer', url: '#footer'}
];
data.palettes = require('./palettes');
data.typography = require('./typography');
data.icons = require('./icons.json');
module.exports = data;
