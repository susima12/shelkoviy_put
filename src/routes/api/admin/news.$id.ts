import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";
import { deleteNewsImage, saveNewsImage } from "@/server/news-images";

const NEWS_FIELDS =
  "id, title, excerpt, body, image_url, image_mime, published_at, updated_at, author_id";

type NewsBody = {
  title?: string;
  excerpt?: string;
  body?: string;
  published_at?: string;
  image?: { data: string; mime: string; name?: string };
  remove_image?: boolean;
};

export const Route = createFileRoute("/api/admin/news/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        if (!getUserAdminRole(db, user.id)) return errorResponse("Forbidden", 403);

        const existing = db.prepare("SELECT id FROM news WHERE id = ?").get(params.id);
        if (!existing) return errorResponse("Новость не найдена", 404);

        const body = await parseJsonBody<NewsBody>(request);
        const title = body.title?.trim();
        if (title !== undefined && !title) return errorResponse("Заголовок не может быть пустым");

        const now = new Date().toISOString();
        const fields: string[] = [];
        const values: unknown[] = [];

        if (title !== undefined) {
          fields.push("title = ?");
          values.push(title);
        }
        if (body.excerpt !== undefined) {
          fields.push("excerpt = ?");
          values.push(body.excerpt.trim() || null);
        }
        if (body.body !== undefined) {
          fields.push("body = ?");
          values.push(body.body.trim() || null);
        }
        if (body.published_at !== undefined) {
          fields.push("published_at = ?");
          values.push(body.published_at.trim() || now);
        }

        if (body.remove_image) {
          deleteNewsImage(params.id);
          fields.push("image_url = ?", "image_mime = ?");
          values.push(null, null);
        } else if (body.image) {
          const saved = saveNewsImage(params.id, body.image);
          if (!saved) return errorResponse("Неподдерживаемое изображение или слишком большой размер (макс. 5 МБ)");
          fields.push("image_url = ?", "image_mime = ?");
          values.push(saved, body.image.mime);
        }

        if (fields.length === 0) return errorResponse("Нет данных для обновления");

        fields.push("updated_at = ?");
        values.push(now);
        values.push(params.id);

        db.prepare(`UPDATE news SET ${fields.join(", ")} WHERE id = ?`).run(...values);

        const news = db.prepare(`SELECT ${NEWS_FIELDS} FROM news WHERE id = ?`).get(params.id);
        return jsonResponse({ ok: true, news });
      },

      DELETE: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        if (!getUserAdminRole(db, user.id)) return errorResponse("Forbidden", 403);

        const existing = db.prepare("SELECT id FROM news WHERE id = ?").get(params.id);
        if (!existing) return errorResponse("Новость не найдена", 404);

        deleteNewsImage(params.id);
        db.prepare("DELETE FROM news WHERE id = ?").run(params.id);
        return jsonResponse({ ok: true });
      },
    },
  },
});
