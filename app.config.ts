import type { ConfigContext, ExpoConfig } from 'expo/config';

// Keep release-owned metadata in app.json; only the native OAuth scheme is dynamic.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
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
