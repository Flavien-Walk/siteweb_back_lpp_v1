// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimisations pour accélérer le bundling
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

// Réduire le nombre de workers pour éviter la surcharge
config.maxWorkers = 4;

// Cache plus agressif
config.cacheStores = [];

// Transformer optimisé
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: false, // Garder les logs en dev
    },
  },
};

module.exports = config;
