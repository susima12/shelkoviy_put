import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FESTIVAL_COMPETITIONS } from "@/lib/competitions-data";
import { ADMIN_PASSWORDS } from "@/lib/admin-credentials";
import { JURY_SEED } from "@/server/jury-seed";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDbPath = join(rootDir, "data", "festival.db");
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

let _db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  accepting_applications INTEGER NOT NULL DEFAULT 1,
  age_categories TEXT NOT NULL DEFAULT '[]',
  nominations TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
  leader_full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT,
  city TEXT,
  organization TEXT,
  participant_name TEXT NOT NULL,
  age_category TEXT,
  nomination TEXT,
  performance_title TEXT,
  duration_minutes REAL,
  participants_count INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  video_url TEXT,
  attachment_path TEXT,
  payment_receipt_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jury_members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  regalia TEXT,
  country TEXT,
  photo_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_members (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_conversations (
  id TEXT PRIMARY KEY,
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_a, user_b)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT,
  pinned_at TEXT,
  reply_to TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_comp ON applications(competition_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
`;

function seedCompetitions(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM competitions").get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO competitions (id, slug, name, short_description, description, display_order, accepting_applications, age_categories, nominations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of FESTIVAL_COMPETITIONS) {
    insert.run(
      crypto.randomUUID(),
      c.slug,
      c.name,
      c.short_description,
      c.description,
      c.display_order,
      c.accepting_applications ? 1 : 0,
      JSON.stringify(c.age_categories),
      JSON.stringify(c.nominations)
    );
  }
}

function seedJury(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM jury_members").get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO jury_members (id, full_name, regalia, country, photo_url, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  JURY_SEED.forEach((m, i) => {
    insert.run(crypto.randomUUID(), m.full_name, m.regalia, m.country, m.photo_url, i + 1);
  });
}

/** Создаёт/обновляет 6 админов конкурсов при каждом старте сервера */
export function ensureAdminAccounts(db: Database.Database) {
  const comps = db.prepare("SELECT id, slug, name FROM competitions").all() as {
    id: string;
    slug: string;
    name: string;
  }[];
  const out: { comp: string; email: string; password: string; status: string }[] = [];

  for (const c of comps) {
    const password = ADMIN_PASSWORDS[c.slug];
    if (!password) continue;
    const email = `admin_${c.slug}@festival.local`;
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
    let userId = existing?.id;
    const pwHash = bcrypt.hashSync(password, 10);

    if (!userId) {
      userId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
      ).run(userId, email, pwHash, `Admin · ${c.name}`);
      db.prepare(
        "INSERT INTO profiles (user_id, email, display_name, username) VALUES (?, ?, ?, ?)"
      ).run(userId, email, `Admin · ${c.name}`, `admin_${c.slug}`);
    } else {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(pwHash, userId);
    }

    const role = db
      .prepare("SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin'")
      .get(userId) as { id: string } | undefined;

    if (role) {
      db.prepare("UPDATE user_roles SET competition_id = ? WHERE id = ?").run(c.id, role.id);
    } else {
      db.prepare(
        "INSERT INTO user_roles (id, user_id, role, competition_id) VALUES (?, ?, 'admin', ?)"
      ).run(crypto.randomUUID(), userId, c.id);
    }

    out.push({ comp: c.name, email, password, status: "ok" });
  }
  return out;
}

export async function seedAdmins(db: Database.Database) {
  return ensureAdminAccounts(db);
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA);
  seedCompetitions(_db);
  seedJury(_db);
  ensureAdminAccounts(_db);

  return _db;
}

export function initDb(): Database.Database {
  return getDb();
}

export function parseCompetitionRow(row: Record<string, unknown>) {
  return {
    ...row,
    accepting_applications: Boolean(row.accepting_applications),
    age_categories: JSON.parse(String(row.age_categories || "[]")),
    nominations: JSON.parse(String(row.nominations || "[]")),
  };
}

export function getUserAdminRole(db: Database.Database, userId: string) {
  return db
    .prepare("SELECT competition_id, role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1")
    .get(userId) as { competition_id: string; role: string } | undefined;
}
