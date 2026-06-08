import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole, parseCompetitionRow } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const adminRole = getUserAdminRole(db, user.id);
        if (!adminRole?.competition_id) return errorResponse("Forbidden", 403);

        const compRow = db
          .prepare("SELECT * FROM competitions WHERE id = ?")
          .get(adminRole.competition_id) as Record<string, unknown> | undefined;

        const applications = db
          .prepare("SELECT * FROM applications WHERE competition_id = ? ORDER BY created_at DESC")
          .all(adminRole.competition_id);

        return jsonResponse({
          competition: compRow ? parseCompetitionRow(compRow) : null,
          applications,
        });
      },
    },
  },
});
