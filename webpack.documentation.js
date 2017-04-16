const path = require('path');
const BUILDDIR = path.resolve(__dirname, process.env['npm_package_per_env_documentation_output_folder']);

module.exports = [{
  name: 'client',
  entry: {
    main: path.resolve(__dirname, 'doc/js/main.js')
  },
  output: {
    path: path.resolve(BUILDDIR, 'js'),
    filename: '[name].bundle.js'
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
