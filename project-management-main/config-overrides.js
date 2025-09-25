const path = require('path');
const process = require('process');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    process: require.resolve('process/browser'),
  };
  return config;
};
