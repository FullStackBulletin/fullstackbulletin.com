const path = require('path');
const BUILDDIR = path.resolve(__dirname, process.env['npm_config_output']);

module.exports = [{
  name: 'client',
  entry: {
    main: path.resolve(__dirname, 'assets/scripts/main.js')
  },
  output: {
    path: path.resolve(BUILDDIR, 'js'),
    filename: `[name]__${process.env['npm_package_version']}.bundle.min.js`
  },
  context: __dirname,
  target: 'web',
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
}];
