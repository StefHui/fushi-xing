// Storage keys per environment — keeps test/UAT/production data fully isolated.
// Production intentionally uses the original name to avoid orphaning existing saves.

import { appEnv } from './env';

const SUFFIX = appEnv === 'production' ? '' : `-${appEnv}`;

export const DB_NAME = `project-wanderer${SUFFIX}.db`;
export const WEB_KEY_SETTINGS = `project-wanderer${SUFFIX}-settings`;
export const WEB_SAVE_PREFIX = `project-wanderer${SUFFIX}-save:`;
