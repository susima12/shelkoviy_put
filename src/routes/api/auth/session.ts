import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { createToken, getTokenFromRequest, jsonResponse, verifyToken } from "@/server/auth";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getTokenFromRequest(request);
        if (!token) return jsonResponse({ user: null });

        const payload = await verifyToken(token);
        if (!payload) return jsonResponse({ user: null });

        const db = getDb();
        const row = db
          .prepare("SELECT id, email, display_name FROM users WHERE id = ?")
          .get(payload.id) as { id: string; email: string; display_name: string | null } | undefined;

        if (!row) return jsonResponse({ user: null });

        const adminRole = getUserAdminRole(db, row.id);
        const user = {
          id: row.id,
          email: row.email,
          display_name: row.display_name,
          is_admin: !!adminRole,
          admin_competition_id: adminRole?.competition_id ?? null,
        };

        const newToken = await createToken(user);
        return jsonResponse({ user, token: newToken });
      },
    },
  },
});
