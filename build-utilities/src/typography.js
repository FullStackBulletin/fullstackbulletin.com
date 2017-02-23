import sass from 'node-sass';
import sassUtilsLib from 'node-sass-utils';
const sassUtils = sassUtilsLib(sass);

const getTypography = typography => () => sassUtils.castToSass(typography);
const getType = typography => name => sassUtils.castToSass(typography[name.getValue()]);

module.exports = {
  getType,
  getTypography
};
