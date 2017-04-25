var data = require('./../../' + process.env['npm_package_per_env_documentation_output_folder'] + '/data.json');
data.palettes = require('./../palettes');
data.navigation = require('./navigation');
data.typography = require('./../typography');
data.icons = require('./../icons.json');
module.exports = data;