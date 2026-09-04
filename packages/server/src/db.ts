import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { log } from './logger.js';

export interface SessionRow {
  id: string;
  code: string;
  host_secret: string;
  status: string;
  paused_from: string | null;
  current_puzzle_index: number;
  started_at: number | null;
  paused_at: number | null;
  total_paused_ms: number;
  bonus_ms: number;
  phase_ends_at: number | null;
  puzzle_state_json: string;
  puzzle_status_json: string;
  hints_used: number;
  hint_revealed: number;
  puzzle_entered_at: number | null;
  solver_id: string | null;
  candidate_id: string | null;
  created_at: number;
  finished_at: number | null;
  result_json: string | null;
}

export interface PlayerRow {
  id: string;
  session_id: string;
  token: string;
  display_name: string;
  avatar: number;
  connected: number;
  solver_count: number;
  declined_current_puzzle: number;
  created_at: number;
  last_seen_at: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_secret TEXT NOT NULL,
  status TEXT NOT NULL,
  paused_from TEXT,
  current_puzzle_index INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  paused_at INTEGER,
  total_paused_ms INTEGER NOT NULL DEFAULT 0,
  bonus_ms INTEGER NOT NULL DEFAULT 0,
  phase_ends_at INTEGER,
  puzzle_state_json TEXT NOT NULL DEFAULT '{}',
  puzzle_status_json TEXT NOT NULL DEFAULT '{}',
  hints_used INTEGER NOT NULL DEFAULT 0,
  hint_revealed INTEGER NOT NULL DEFAULT 0,
  puzzle_entered_at INTEGER,
  solver_id TEXT,
  candidate_id TEXT,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  result_json TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar INTEGER NOT NULL DEFAULT 0,
  connected INTEGER NOT NULL DEFAULT 0,
  solver_count INTEGER NOT NULL DEFAULT 0,
  declined_current_puzzle INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);

CREATE TABLE IF NOT EXISTS puzzle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  puzzle_id TEXT,
  player_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_session ON puzzle_events(session_id);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * Additive column migrations for databases created by an earlier version.
 * A live event must survive an update without losing its running session, so
 * this runs on every boot and is a no-op once the column exists.
 */
const COLUMN_MIGRATIONS: { table: string; column: string; definition: string }[] = [
  { table: 'players', column: 'avatar', definition: 'INTEGER NOT NULL DEFAULT 0' },
];

function migrateColumns(db: Db): void {
  for (const migration of COLUMN_MIGRATIONS) {
    const columns = db.prepare(`PRAGMA table_info(${migration.table})`).all() as { name: string }[];
    if (columns.some((column) => column.name === migration.column)) continue;
    db.exec(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition}`);
    log.info('db.migrated', { table: migration.table, column: migration.column });
  }
}

export type Db = Database.Database;

export function openDatabase(file: string = config.databaseFile): Db {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrateColumns(db);
  log.info('db.ready', { file: file === ':memory:' ? ':memory:' : path.basename(file) });
  return db;
}

export class Repository {
  constructor(private readonly db: Db) {}

  insertSession(row: SessionRow): void {
    this.db
      .prepare(
        `INSERT INTO sessions (id, code, host_secret, status, paused_from, current_puzzle_index,
          started_at, paused_at, total_paused_ms, bonus_ms, phase_ends_at, puzzle_state_json,
          puzzle_status_json, hints_used, hint_revealed, puzzle_entered_at, solver_id,
          candidate_id, created_at, finished_at, result_json)
         VALUES (@id, @code, @host_secret, @status, @paused_from, @current_puzzle_index,
          @started_at, @paused_at, @total_paused_ms, @bonus_ms, @phase_ends_at, @puzzle_state_json,
          @puzzle_status_json, @hints_used, @hint_revealed, @puzzle_entered_at, @solver_id,
          @candidate_id, @created_at, @finished_at, @result_json)`,
      )
      .run(row);
  }

  updateSession(row: SessionRow): void {
    this.db
      .prepare(
        `UPDATE sessions SET status=@status, paused_from=@paused_from,
          current_puzzle_index=@current_puzzle_index, started_at=@started_at, paused_at=@paused_at,
          total_paused_ms=@total_paused_ms, bonus_ms=@bonus_ms, phase_ends_at=@phase_ends_at,
          puzzle_state_json=@puzzle_state_json, puzzle_status_json=@puzzle_status_json,
          hints_used=@hints_used, hint_revealed=@hint_revealed, puzzle_entered_at=@puzzle_entered_at,
          solver_id=@solver_id, candidate_id=@candidate_id, finished_at=@finished_at,
          result_json=@result_json
         WHERE id=@id`,
      )
      .run(row);
  }

  findSessionByCode(code: string): SessionRow | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE code = ?').get(code) as SessionRow | undefined;
  }

  listSessions(): SessionRow[] {
    return this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() as SessionRow[];
  }

  upsertPlayer(row: PlayerRow): void {
    this.db
      .prepare(
        `INSERT INTO players (id, session_id, token, display_name, avatar, connected, solver_count,
           declined_current_puzzle, created_at, last_seen_at)
         VALUES (@id, @session_id, @token, @display_name, @avatar, @connected, @solver_count,
           @declined_current_puzzle, @created_at, @last_seen_at)
         ON CONFLICT(id) DO UPDATE SET display_name=@display_name, avatar=@avatar, connected=@connected,
           solver_count=@solver_count, declined_current_puzzle=@declined_current_puzzle,
           last_seen_at=@last_seen_at`,
      )
      .run(row);
  }

  listPlayers(sessionId: string): PlayerRow[] {
    return this.db
      .prepare('SELECT * FROM players WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as PlayerRow[];
  }

  deletePlayers(sessionId: string): void {
    this.db.prepare('DELETE FROM players WHERE session_id = ?').run(sessionId);
  }

  recordEvent(
    sessionId: string,
    eventType: string,
    puzzleId: string | null,
    playerId: string | null,
    payload: unknown,
  ): void {
    this.db
      .prepare(
        `INSERT INTO puzzle_events (session_id, puzzle_id, player_id, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(sessionId, puzzleId, playerId, eventType, payload === undefined ? null : JSON.stringify(payload), Date.now());
  }

  /* --- application wide key/value, used for the host token secret --- */

  readMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  writeMeta(key: string, value: string): void {
    this.db
      .prepare(
        'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, value);
  }

  /** Housekeeping: drop sessions that finished or went stale long ago. */
  purgeOlderThan(cutoff: number): number {
    const result = this.db.prepare('DELETE FROM sessions WHERE created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM puzzle_events WHERE created_at < ?').run(cutoff);
    return result.changes;
  }
}
