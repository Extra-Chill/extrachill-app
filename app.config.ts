import type { ConfigContext, ExpoConfig } from 'expo/config';

// Keep release metadata in app.json; inject environment-owned native configuration.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME
          || 'com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID',
      },
    ],
  ],
});
