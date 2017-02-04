// const webpack = require('webpack');
const path = require('path');
const BUILDDIR = path.resolve(__dirname, 'dist');

module.exports = [{
  name: 'client',
  entry: {
    main: path.resolve(__dirname, 'assets/scripts/main.js')
  },
  target: 'node-webkit',
  output: {
    path: path.resolve(BUILDDIR, 'js'),
    filename: '[name].bundle.js'
  },
  externals: {
    jquery: '$'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
}];
