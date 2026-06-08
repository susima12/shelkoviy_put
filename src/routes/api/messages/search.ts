import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/messages/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
        if (!q || q.length < 2) return jsonResponse({ profiles: [] });

        const db = getDb();
        const profiles = db
          .prepare(
            `SELECT user_id, username, display_name, email, avatar_url FROM profiles
             WHERE user_id != ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(email) LIKE ?)
             LIMIT 20`
          )
          .all(user.id, `%${q}%`, `%${q}%`, `%${q}%`);

        return jsonResponse({ profiles });
      },
    },
  },
});
