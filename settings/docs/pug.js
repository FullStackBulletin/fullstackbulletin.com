var data = require('./../../' + process.env['npm_config_output'] + '/data.json');
data.palettes = require('./../palettes');
data.navigation = require('./navigation');
data.typography = require('./../typography');
data.icons = require('./../icons.json');
module.exports = data;