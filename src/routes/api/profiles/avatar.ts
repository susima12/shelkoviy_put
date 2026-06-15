import { createFileRoute } from "@tanstack/react-router";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

const uploadsDir = join(process.cwd(), "data", "uploads", "avatars");
const MAX_BYTES = 2 * 1024 * 1024;

export const Route = createFileRoute("/api/profiles/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const { image } = await parseJsonBody<{ image: string }>(request);
        if (!image?.startsWith("data:image/")) {
          return errorResponse("Неподдерживаемый формат изображения");
        }

        const match = image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
        if (!match) return errorResponse("Допустимы JPEG, PNG или WebP");

        const ext = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.length > MAX_BYTES) return errorResponse("Файл слишком большой (макс. 2 МБ)");

        if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

        const filename = `${user.id}.${ext}`;
        writeFileSync(join(uploadsDir, filename), buffer);

        const avatar_url = `/api/profiles/avatar/${user.id}?v=${Date.now()}`;
        const db = getDb();
        const existing = db.prepare("SELECT user_id FROM profiles WHERE user_id = ?").get(user.id);
        if (existing) {
          db.prepare("UPDATE profiles SET avatar_url = ? WHERE user_id = ?").run(avatar_url, user.id);
        } else {
          db.prepare(
            "INSERT INTO profiles (user_id, email, display_name, username, avatar_url) VALUES (?, ?, ?, ?, ?)"
          ).run(user.id, user.email, user.display_name ?? user.email, null, avatar_url);
        }

        const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id);
        return jsonResponse({ profile, avatar_url });
      },
    },
  },
});
