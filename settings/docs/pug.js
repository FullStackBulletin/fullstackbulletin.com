var destFolder = process.env['npm_config_output'];
var data = require('./../../' + destFolder + '/data.json');

data.fixtures = {
  navigation: require('./../../doc/fixtures/navigation'),
  faqs: require('./../../doc/fixtures/faqs'),
  founders: require('./../../doc/fixtures/founders'),
  subscribeForm: require('./../../doc/fixtures/subscribe-form'),
  header: require('./../../doc/fixtures/header'),
  footer: require('./../../doc/fixtures/footer'),
};

data.palettes = require('./../palettes');
data.navigation = require('./navigation');
data.typography = require('./../typography');
data.icons = require('./../../' + destFolder + '/icons.json');
module.exports = data;