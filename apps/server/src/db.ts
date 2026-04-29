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

  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Add avatar column to existing databases
const agentCols = (db.pragma('table_info(agents)') as { name: string }[]).map((c) => c.name);
if (!agentCols.includes('avatar')) {
  db.exec('ALTER TABLE agents ADD COLUMN avatar TEXT');
}

// Add backlog_position column for manual priority ordering in Backlog lane
const cardCols = (db.pragma('table_info(cards)') as { name: string }[]).map((c) => c.name);
if (!cardCols.includes('backlog_position')) {
  db.exec('ALTER TABLE cards ADD COLUMN backlog_position INTEGER');
  const backlogCards = db.prepare(
    "SELECT id FROM cards WHERE column = 'Backlog' ORDER BY created_at ASC"
  ).all() as { id: string }[];
  const updatePos = db.prepare('UPDATE cards SET backlog_position = ? WHERE id = ?');
  backlogCards.forEach((c, i) => updatePos.run(i + 1, c.id));
}

// Backfill default agents with avatar seeds
const defaultAvatars: [string, string][] = [
  ['planner', 'felix'], ['scribe', 'luna'], ['forge', 'max'],
  ['loom', 'aria'], ['sentinel', 'kai'], ['pilot', 'nova'],
];
const backfillAvatar = db.prepare('UPDATE agents SET avatar = ? WHERE id = ? AND avatar IS NULL');
for (const [id, avatar] of defaultAvatars) {
  backfillAvatar.run(avatar, id);
}

export default db;
