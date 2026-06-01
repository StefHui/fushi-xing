import Constants from 'expo-constants';

export type AppEnv = 'test' | 'uat' | 'production';

export const appEnv: AppEnv =
  (Constants.expoConfig?.extra?.appEnv as AppEnv) ?? 'test';

export const isTest = appEnv === 'test';
export const isUat = appEnv === 'uat';
export const isProduction = appEnv === 'production';
