import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/messages/conversations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const convs = db
          .prepare(
            `SELECT * FROM dm_conversations WHERE user_a = ? OR user_b = ? ORDER BY last_message_at DESC`
          )
          .all(user.id, user.id) as { id: string; user_a: string; user_b: string; last_message_at: string }[];

        const result = convs.map((c) => {
          const otherId = c.user_a === user.id ? c.user_b : c.user_a;
          const other = db
            .prepare("SELECT user_id, username, display_name, email, avatar_url FROM profiles WHERE user_id = ?")
            .get(otherId);
          return { ...c, other };
        });

        return jsonResponse({ conversations: result });
      },

      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const body = await parseJsonBody<{ username?: string; user_id?: string }>(request);
        const db = getDb();

        let targetId: string | undefined;
        if (body.user_id) {
          targetId = body.user_id;
        } else if (body.username?.trim()) {
          const target = db
            .prepare("SELECT user_id FROM profiles WHERE username = ? COLLATE NOCASE")
            .get(body.username.trim().toLowerCase()) as { user_id: string } | undefined;
          targetId = target?.user_id;
        }

        if (!targetId || targetId === user.id) return errorResponse("Пользователь не найден", 404);

        const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(targetId);
        if (!exists) return errorResponse("Пользователь не найден", 404);

        const [a, b] = user.id < targetId ? [user.id, targetId] : [targetId, user.id];
        let conv = db
          .prepare("SELECT id FROM dm_conversations WHERE user_a = ? AND user_b = ?")
          .get(a, b) as { id: string } | undefined;

        if (!conv) {
          const id = crypto.randomUUID();
          db.prepare("INSERT INTO dm_conversations (id, user_a, user_b) VALUES (?, ?, ?)").run(id, a, b);
          conv = { id };
        }

        return jsonResponse({ conversation_id: conv.id });
      },
    },
  },
});
