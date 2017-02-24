var data = require('./../dist/data.json');
data.navigation = [
  {
    label: 'Basic',
    items: [
      {label: 'Logo', url: '#logo'},
      {label: 'Palettes', url: '#palettes'},
      {label: 'Typography', url: '#typography'},
      {label: 'Icons', url: '#icons'}
    ]
  },
  {
    label: 'Components',
    items: [
      {label: 'Separator', url: '#separator'},
      {label: 'Subscribe form', url: '#subscribe-form'},
      {label: 'Faq', url: '#faq'}
    ]
  },
  {
    label: 'Layouts',
    items: [
      {label: 'Header', url: '#header'},
      {label: 'Subscribe', url: '#subscribe'},
      {label: 'Footer', url: '#footer'}
    ]
  }
];
data.palettes = require('./palettes');
data.typography = require('./typography');
data.icons = require('./icons.json');
module.exports = data;
