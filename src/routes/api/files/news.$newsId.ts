import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "node:fs";
import { getDb } from "@/server/db";
import { newsImagePath } from "@/server/news-images";

export const Route = createFileRoute("/api/files/news/$newsId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getDb();
        const row = db
          .prepare("SELECT image_mime FROM news WHERE id = ?")
          .get(params.newsId) as { image_mime: string | null } | undefined;

        const path = newsImagePath(params.newsId, row?.image_mime);
        if (!path) return new Response("Not found", { status: 404 });

        const data = readFileSync(path);
        const mime = row?.image_mime || "image/jpeg";
        return new Response(data, {
          status: 200,
          headers: {
            "content-type": mime,
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
