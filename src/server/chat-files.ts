import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import type Database from "better-sqlite3";
import { getUserAdminRole } from "@/server/db";

const BASE = join(process.cwd(), "data", "uploads", "chat");

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const FILE_MIME = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
]);

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_FILE = 10 * 1024 * 1024;

export type AttachmentInput = {
  data: string;
  name: string;
  mime: string;
};

export type SavedAttachment = {
  attachment_url: string;
  attachment_name: string;
  attachment_mime: string;
};

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
  };
  return map[mime] || ".bin";
}

function nameSafe(name: string): string {
  return name.replace(/[^\w.\-()а-яА-ЯёЁ ]/gi, "").slice(0, 120) || "file";
}

export function parseAttachmentInput(input: AttachmentInput): { buffer: Buffer; mime: string; name: string } | null {
  const mime = input.mime?.trim().toLowerCase() || "";
  const name = nameSafe(input.name || "file");
  const raw = input.data?.trim();
  if (!raw) return null;

  let buffer: Buffer;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    buffer = Buffer.from(match[2], "base64");
  } else {
    buffer = Buffer.from(raw, "base64");
  }

  const isImage = IMAGE_MIME.has(mime) || mime.startsWith("image/");
  const isFile = FILE_MIME.has(mime);
  if (!isImage && !isFile) return null;
  if (isImage && buffer.length > MAX_IMAGE) return null;
  if (!isImage && buffer.length > MAX_FILE) return null;

  return { buffer, mime: mime || "application/octet-stream", name };
}

export function saveChatAttachment(
  kind: "dm" | "comp",
  messageId: string,
  input: AttachmentInput
): SavedAttachment | null {
  const parsed = parseAttachmentInput(input);
  if (!parsed) return null;

  const dir = join(BASE, kind);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ext = extFromMime(parsed.mime) || extname(parsed.name) || ".bin";
  const path = join(dir, `${messageId}${ext}`);
  writeFileSync(path, parsed.buffer);

  return {
    attachment_url: `/api/files/chat/${messageId}`,
    attachment_name: parsed.name,
    attachment_mime: parsed.mime,
  };
}

export function chatFilePath(kind: "dm" | "comp", messageId: string, mime?: string | null): string | null {
  const dir = join(BASE, kind);
  if (mime) {
    const ext = extFromMime(mime);
    const path = join(dir, `${messageId}${ext}`);
    if (existsSync(path)) return path;
  }
  for (const ext of [".jpg", ".png", ".webp", ".gif", ".pdf", ".txt", ".doc", ".docx", ".zip", ".bin"]) {
    const path = join(dir, `${messageId}${ext}`);
    if (existsSync(path)) return path;
  }
  return null;
}

export function userCanAccessChatFile(
  db: Database.Database,
  userId: string,
  messageId: string
): { kind: "dm" | "comp"; mime: string | null; name: string | null } | null {
  const dm = db
    .prepare(
      `SELECT m.*, c.user_a, c.user_b FROM dm_messages m
       JOIN dm_conversations c ON c.id = m.conversation_id
       WHERE m.id = ? AND m.deleted_at IS NULL`
    )
    .get(messageId) as
    | { user_a: string; user_b: string; attachment_mime: string | null; attachment_name: string | null }
    | undefined;

  if (dm && (dm.user_a === userId || dm.user_b === userId)) {
    return { kind: "dm", mime: dm.attachment_mime, name: dm.attachment_name };
  }

  const comp = db
    .prepare(
      `SELECT m.*, m.competition_id FROM chat_messages m WHERE m.id = ?`
    )
    .get(messageId) as { competition_id: string; attachment_mime: string | null; attachment_name: string | null } | undefined;

  if (comp) {
    const adminRole = getUserAdminRole(db, userId);
    const isAdmin = adminRole?.competition_id === comp.competition_id;
    const member = db
      .prepare("SELECT id FROM chat_members WHERE competition_id = ? AND user_id = ? AND banned = 0")
      .get(comp.competition_id, userId);
    if (isAdmin || member) {
      return { kind: "comp", mime: comp.attachment_mime, name: comp.attachment_name };
    }
  }

  return null;
}
