const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Polyfill Node's crypto with browser built-in
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
  };

  return config;
};
