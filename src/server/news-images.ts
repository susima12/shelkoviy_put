import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const BASE = join(process.cwd(), "data", "uploads", "news");
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;

export type NewsImageInput = {
  data: string;
  name?: string;
  mime: string;
};

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[mime] || ".jpg";
}

export function parseNewsImage(input: NewsImageInput): { buffer: Buffer; mime: string } | null {
  const mime = input.mime?.trim().toLowerCase() || "";
  if (!IMAGE_MIME.has(mime)) return null;

  const raw = input.data?.trim();
  if (!raw) return null;

  let buffer: Buffer;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) buffer = Buffer.from(match[2], "base64");
  else buffer = Buffer.from(raw, "base64");

  if (buffer.length > MAX_SIZE) return null;
  return { buffer, mime };
}

export function saveNewsImage(newsId: string, input: NewsImageInput): string | null {
  const parsed = parseNewsImage(input);
  if (!parsed) return null;

  if (!existsSync(BASE)) mkdirSync(BASE, { recursive: true });
  deleteNewsImage(newsId);

  const ext = extFromMime(parsed.mime) || extname(input.name || "") || ".jpg";
  writeFileSync(join(BASE, `${newsId}${ext}`), parsed.buffer);
  return `/api/files/news/${newsId}`;
}

export function deleteNewsImage(newsId: string): void {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    const path = join(BASE, `${newsId}${ext}`);
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        /* ignore */
      }
    }
  }
}

export function newsImagePath(newsId: string, mime?: string | null): string | null {
  if (mime) {
    const path = join(BASE, `${newsId}${extFromMime(mime)}`);
    if (existsSync(path)) return path;
  }
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    const path = join(BASE, `${newsId}${ext}`);
    if (existsSync(path)) return path;
  }
  return null;
}
