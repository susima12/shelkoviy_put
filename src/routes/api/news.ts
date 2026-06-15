import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { jsonResponse } from "@/server/auth";

const NEWS_FIELDS =
  "id, title, excerpt, body, image_url, image_mime, published_at, updated_at";

export const Route = createFileRoute("/api/news")({
  server: {
    handlers: {
      GET: async () => {
        const db = getDb();
        const news = db
          .prepare(`SELECT ${NEWS_FIELDS} FROM news ORDER BY published_at DESC`)
          .all();
        return jsonResponse({ news });
      },
    },
  },
});
