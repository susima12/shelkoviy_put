import { createFileRoute } from "@tanstack/react-router";
import { getDb, parseCompetitionRow } from "@/server/db";
import { jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/competitions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const acceptingOnly = url.searchParams.get("accepting") === "1";
        const limit = url.searchParams.get("limit");

        const db = getDb();
        let sql = "SELECT * FROM competitions";
        const conditions: string[] = [];
        if (acceptingOnly) conditions.push("accepting_applications = 1");
        if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
        sql += " ORDER BY display_order";
        if (limit) sql += ` LIMIT ${parseInt(limit, 10) || 100}`;

        const rows = db.prepare(sql).all() as Record<string, unknown>[];
        const data = rows.map(parseCompetitionRow);
        return jsonResponse({ data });
      },
    },
  },
});
