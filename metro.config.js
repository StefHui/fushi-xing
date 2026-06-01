const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const webStubs = {
  'expo-sqlite': path.resolve(__dirname, 'src/mocks/expo-sqlite-web.ts'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { type: 'sourceFile', filePath: webStubs[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
