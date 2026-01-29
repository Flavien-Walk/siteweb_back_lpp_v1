module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Optimisation des re-renders avec React Compiler (optionnel si supporté)
      // Reanimated doit être le dernier plugin
      'react-native-reanimated/plugin',
    ],
  };
};
