import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";
import { saveNewsImage } from "@/server/news-images";

const NEWS_FIELDS =
  "id, title, excerpt, body, image_url, image_mime, published_at, updated_at, author_id";

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: errorResponse("Unauthorized", 401) as Response };
  const db = getDb();
  const role = getUserAdminRole(db, user.id);
  if (!role) return { error: errorResponse("Forbidden", 403) as Response };
  return { user, db };
}

type NewsBody = {
  title?: string;
  excerpt?: string;
  body?: string;
  published_at?: string;
  image?: { data: string; mime: string; name?: string };
  remove_image?: boolean;
};

export const Route = createFileRoute("/api/admin/news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAdmin(request);
        if ("error" in auth) return auth.error;

        const news = auth.db
          .prepare(`SELECT ${NEWS_FIELDS} FROM news ORDER BY published_at DESC`)
          .all();
        return jsonResponse({ news });
      },

      POST: async ({ request }) => {
        const auth = await requireAdmin(request);
        if ("error" in auth) return auth.error;

        const body = await parseJsonBody<NewsBody>(request);
        const title = body.title?.trim();
        if (!title) return errorResponse("Укажите заголовок");

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const published = body.published_at?.trim() || now;

        let image_url: string | null = null;
        let image_mime: string | null = null;
        if (body.image) {
          const saved = saveNewsImage(id, body.image);
          if (!saved) return errorResponse("Неподдерживаемое изображение или слишком большой размер (макс. 5 МБ)");
          image_url = saved;
          image_mime = body.image.mime;
        }

        auth.db
          .prepare(
            `INSERT INTO news (id, title, excerpt, body, image_url, image_mime, published_at, updated_at, author_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            title,
            body.excerpt?.trim() || null,
            body.body?.trim() || null,
            image_url,
            image_mime,
            published,
            now,
            auth.user.id
          );

        const news = auth.db.prepare(`SELECT ${NEWS_FIELDS} FROM news WHERE id = ?`).get(id);
        return jsonResponse({ ok: true, news });
      },
    },
  },
});
