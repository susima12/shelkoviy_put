import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, jsonResponse } from "@/server/auth";

const NEWS_FIELDS =
  "id, title, excerpt, body, image_url, image_mime, published_at, updated_at";

export const Route = createFileRoute("/api/news/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getDb();
        const item = db
          .prepare(`SELECT ${NEWS_FIELDS} FROM news WHERE id = ?`)
          .get(params.id);
        if (!item) return errorResponse("Новость не найдена", 404);
        return jsonResponse({ news: item });
      },
    },
  },
});
