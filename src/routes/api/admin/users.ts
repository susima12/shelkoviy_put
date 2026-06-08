import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const adminRole = getUserAdminRole(db, user.id);
        if (!adminRole) return errorResponse("Forbidden", 403);

        const users = db
          .prepare(
            `SELECT user_id, username, display_name, email, avatar_url, bio, created_at
             FROM profiles ORDER BY created_at DESC LIMIT 500`
          )
          .all();

        return jsonResponse({ users });
      },
    },
  },
});
