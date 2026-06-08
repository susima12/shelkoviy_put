import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/jury")({
  server: {
    handlers: {
      GET: async () => {
        const db = getDb();
        const members = db
          .prepare("SELECT id, full_name, title, bio, regalia, country, photo_url FROM jury_members ORDER BY display_order")
          .all();
        return jsonResponse({ members });
      },
    },
  },
});
