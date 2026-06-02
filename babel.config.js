module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'transform-inline-environment-variables',
        {
          include: [
            'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
            'SENTRY_DSN',
            'EXPO_PUBLIC_SENTRY_DSN',
          ],
        },
      ],
    ],
  };
};
