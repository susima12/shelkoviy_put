import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/applications/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const adminRole = getUserAdminRole(getDb(), user.id);
        if (!adminRole) return errorResponse("Forbidden", 403);

        const { status } = await parseJsonBody<{ status: string }>(request);
        const allowed = ["new", "reviewing", "approved", "rejected"];
        if (!allowed.includes(status)) return errorResponse("Недопустимый статус");

        const db = getDb();
        const app = db
          .prepare("SELECT competition_id FROM applications WHERE id = ?")
          .get(params.id) as { competition_id: string } | undefined;

        if (!app || app.competition_id !== adminRole.competition_id) {
          return errorResponse("Заявка не найдена", 404);
        }

        db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, params.id);
        return jsonResponse({ ok: true });
      },
    },
  },
});
