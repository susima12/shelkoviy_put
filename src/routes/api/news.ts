import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/news")({
  server: {
    handlers: {
      GET: async () => {
        const db = getDb();
        const news = db
          .prepare("SELECT id, title, excerpt, published_at FROM news ORDER BY published_at DESC")
          .all();
        return jsonResponse({ news });
      },
    },
  },
});
