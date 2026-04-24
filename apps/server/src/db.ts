import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'artifacts'), { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'agent-board.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    glyph        TEXT NOT NULL,
    hue          INTEGER NOT NULL,
    system_prompt TEXT,
    tools        TEXT NOT NULL,
    owns_column  TEXT,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    priority     TEXT NOT NULL DEFAULT 'M',
    column       TEXT NOT NULL,
    blocked      INTEGER NOT NULL DEFAULT 0,
    block_reason TEXT,
    acceptance   TEXT NOT NULL DEFAULT '[]',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id    TEXT NOT NULL REFERENCES cards(id),
    agent_id   TEXT REFERENCES agents(id),
    kind       TEXT NOT NULL,
    verb       TEXT NOT NULL,
    target     TEXT,
    t          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS artifacts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id   TEXT NOT NULL REFERENCES cards(id),
    agent_id  TEXT NOT NULL REFERENCES agents(id),
    kind      TEXT NOT NULL,
    title     TEXT NOT NULL,
    meta      TEXT,
    path      TEXT,
    t         INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id   TEXT NOT NULL REFERENCES cards(id),
    author    TEXT NOT NULL,
    text      TEXT NOT NULL,
    addresses TEXT,
    t         INTEGER NOT NULL
  );
`);

export default db;
