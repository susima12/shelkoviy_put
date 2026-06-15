import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FESTIVAL_COMPETITIONS } from "@/lib/competitions-data";
import { ADMIN_PASSWORDS } from "@/lib/admin-credentials";
import { JURY_SEED } from "@/server/jury-seed";

/**
 * =============================================================================
 * SQLite-база фестиваля «Шёлковый путь» — соответствие ER-диаграмме диплома
 * =============================================================================
 * Файл БД на диске: data/festival.db (переменная окружения DATABASE_PATH)
 *
 * ER «Роли»                    → таблица user_roles (поле role: 'admin' | …)
 * ER «Пользователь»            → таблица users (+ расширение profiles)
 * ER «Конкурсы»                → таблица competitions
 * ER «Номинации»               → competitions.nominations (JSON-массив в строке)
 * ER «Возрастные категории»    → competitions.age_categories (JSON-массив)
 * ER «Заявки»                  → таблица applications
 * ER «Статус заявки»           → поле applications.status ('new'|'approved'|…)
 * ER «Жюри»                    → таблица jury_members
 * ER «Новости»                 → таблица news
 * ER «Комментарии к заявкам»   → пока не реализовано (можно добавить позже)
 * ER «Уведомления»             → пока не реализовано (уведомления через UI/toast)
 * ER «Документы»               → статические страницы /payment, /about (не в БД)
 *
 * Где на сайте используется каждая сущность — см. комментарии у CREATE TABLE ниже.
 * API-обработчики: src/routes/api/*.ts
 * Страницы: src/pages/*.tsx и src/routes/*.tsx
 * =============================================================================
 */

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDbPath = join(rootDir, "data", "festival.db");
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

let _db: Database.Database | null = null;

const SCHEMA = `
-- ER: Пользователь. Страницы: /auth, /profile. API: /api/auth/*, /api/profiles/me
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Профиль участника (имя, ID для сообщений, аватар). Страница: /profile
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ER: Роли. Админ видит /admin, участник — /profile. API: getUserAdminRole()
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL
);

-- ER: Конкурсы (+ номинации и возрастные категории в JSON). Страницы: /competitions, /apply
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

-- ER: Заявки (+ статус в поле status). Страницы: /apply, /my-applications, /admin
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

-- ER: Жюри. Страница: /jury. API: /api/jury
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

-- ER: Новости. Страница: /news. API: /api/news
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Чат конкурса (доп. к диаграмме). Страница: /chat/$slug. API: /api/chat/$slug
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_members (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(competition_id, user_id)
);

-- Личные сообщения между пользователями. Страницы: /messages, /admin/chat
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
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT,
  pinned_at TEXT,
  reply_to TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_comp ON applications(competition_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
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

    if (!userId) {
      const pwHash = bcrypt.hashSync(password, 10);
      userId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
      ).run(userId, email, pwHash, `Admin · ${c.name}`);
      db.prepare(
        "INSERT INTO profiles (user_id, email, display_name, username) VALUES (?, ?, ?, ?)"
      ).run(userId, email, `Admin · ${c.name}`, `admin_${c.slug}`);
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

function migrateChatAttachments(db: Database.Database) {
  const addCol = (table: string, col: string, type: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    }
  };
  for (const table of ["dm_messages", "chat_messages"]) {
    addCol(table, "attachment_url", "TEXT");
    addCol(table, "attachment_name", "TEXT");
    addCol(table, "attachment_mime", "TEXT");
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA);
  migrateChatAttachments(_db);
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
