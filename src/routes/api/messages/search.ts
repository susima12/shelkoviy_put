import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse } from "@/server/auth";

/** Дополнительные латинские варианты для кириллического ввода (напр. «адми» → admin). */
function searchPatterns(q: string): string[] {
  const patterns = [`%${q}%`];
  const lower = q.toLowerCase();
  if (lower.startsWith("адм")) patterns.push("%admin%");
  return [...new Set(patterns)];
}

export const Route = createFileRoute("/api/messages/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
        const db = getDb();

        // Пустой запрос — список зарегистрированных пользователей (для выбора в чате)
        if (!q) {
          const profiles = db
            .prepare(
              `SELECT u.id AS user_id, p.username,
                      COALESCE(p.display_name, u.display_name) AS display_name,
                      u.email, p.avatar_url
               FROM users u
               LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.id != ?
               ORDER BY COALESCE(p.display_name, u.display_name, u.email) COLLATE NOCASE
               LIMIT 30`
            )
            .all(user.id);
          return jsonResponse({ profiles });
        }

        const patterns = searchPatterns(q);
        const conditions = patterns
          .map(
            () =>
              `(LOWER(COALESCE(p.username, '')) LIKE ?
                OR LOWER(COALESCE(p.display_name, u.display_name, '')) LIKE ?
                OR LOWER(u.email) LIKE ?)`
          )
          .join(" OR ");

        const params: (string | number)[] = [user.id];
        for (const like of patterns) {
          params.push(like, like, like);
        }

        const profiles = db
          .prepare(
            `SELECT u.id AS user_id, p.username,
                    COALESCE(p.display_name, u.display_name) AS display_name,
                    u.email, p.avatar_url
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id != ? AND (${conditions})
             ORDER BY COALESCE(p.display_name, u.display_name, u.email) COLLATE NOCASE
             LIMIT 20`
          )
          .all(...params);

        return jsonResponse({ profiles });
      },
    },
  },
});
