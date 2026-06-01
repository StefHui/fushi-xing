import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface PersistedSettings {
  provider: 'openai' | 'claude' | 'off';
  openaiKey: string;
  claudeKey: string;
  aiEnabled: boolean;
  lowTokenMode: boolean;
  gameMode: 'offline' | 'ai-enhanced';
}

const DEFAULT_SETTINGS: PersistedSettings = {
  provider: 'off',
  openaiKey: '',
  claudeKey: '',
  aiEnabled: false,
  lowTokenMode: true,
  gameMode: 'offline',
};

const WEB_KEY = 'project-wanderer-settings';
const DB_NAME = 'project-wanderer.db'; // same DB as saves
const SETTINGS_ROW_KEY = 'ai_settings';

export async function loadSettings(): Promise<PersistedSettings> {
  if (Platform.OS === 'web') {
    try {
      const raw = localStorage.getItem(WEB_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PersistedSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
    );
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      SETTINGS_ROW_KEY,
    );
    return row ? { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<PersistedSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(WEB_KEY, JSON.stringify(settings));
    return;
  }

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
    );
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SETTINGS_ROW_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Non-fatal — settings revert to defaults on next load
  }
}
