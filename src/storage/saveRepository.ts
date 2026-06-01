import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import type { GameState, SaveSummary } from '../types/game';
import { DB_NAME, WEB_SAVE_PREFIX as WEB_SAVE_PREFIX_CONFIG } from '../config/storage';

const DATABASE_NAME = DB_NAME;
const DATABASE_VERSION = 1;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initializeDatabase() {
  if (isWebPreview()) {
    return;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS saves (
        id TEXT PRIMARY KEY NOT NULL,
        character_name TEXT NOT NULL,
        region_name TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

export async function saveGameState(game: GameState) {
  if (isWebPreview()) {
    localStorage.setItem(getWebSaveKey(game.id), JSON.stringify(game));
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO saves (id, character_name, region_name, updated_at, payload)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       character_name = excluded.character_name,
       region_name = excluded.region_name,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    game.id,
    game.character.name,
    game.world.regionName,
    game.updatedAt,
    JSON.stringify(game),
  );
}

export async function loadGameState(id: string) {
  if (isWebPreview()) {
    const payload = localStorage.getItem(getWebSaveKey(id));
    return payload ? (JSON.parse(payload) as GameState) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM saves WHERE id = ?', id);
  return row ? (JSON.parse(row.payload) as GameState) : null;
}

export async function listSaves(): Promise<SaveSummary[]> {
  if (isWebPreview()) {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(WEB_SAVE_PREFIX))
      .map((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as GameState)
      .filter((game) => Boolean(game.id && game.character && game.world?.type))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((game) => ({
        id: game.id,
        characterName: game.character.name,
        regionName: game.world.regionName,
        updatedAt: game.updatedAt,
      }));
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    character_name: string;
    region_name: string;
    updated_at: string;
  }>('SELECT id, character_name, region_name, updated_at FROM saves ORDER BY updated_at DESC');

  return rows.map((row) => ({
    id: row.id,
    characterName: row.character_name,
    regionName: row.region_name,
    updatedAt: row.updated_at,
  }));
}

async function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

const WEB_SAVE_PREFIX = WEB_SAVE_PREFIX_CONFIG;

function isWebPreview() {
  return Platform.OS === 'web';
}

function getWebSaveKey(id: string) {
  return `${WEB_SAVE_PREFIX}${id}`;
}
