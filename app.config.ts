import type { ExpoConfig, ConfigContext } from 'expo/config';

const ENV = process.env.APP_ENV ?? 'test';

const envConfig: Record<string, { name: string; bundleId: string; version: string }> = {
  test: {
    name: '浮世行 TEST',
    bundleId: 'com.stefhui.fushixing.test',
    version: '0.0.1',
  },
  uat: {
    name: '浮世行 UAT',
    bundleId: 'com.stefhui.fushixing.uat',
    version: '0.9.0',
  },
  production: {
    name: '浮世行',
    bundleId: 'com.stefhui.fushixing',
    version: '1.0.0',
  },
};

const current = envConfig[ENV] ?? envConfig.test;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: current.name,
  slug: 'fushi-xing',
  version: current.version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: current.bundleId,
  },
  android: {
    package: current.bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    appEnv: ENV,
  },
});
