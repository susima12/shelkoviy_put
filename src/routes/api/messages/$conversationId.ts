import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/messages/$conversationId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const conv = db
          .prepare("SELECT * FROM dm_conversations WHERE id = ?")
          .get(params.conversationId) as { user_a: string; user_b: string } | undefined;

        if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
          return errorResponse("Forbidden", 403);
        }

        const messages = db
          .prepare(
            `SELECT * FROM dm_messages WHERE conversation_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`
          )
          .all(params.conversationId);

        const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        const other = db
          .prepare("SELECT user_id, username, display_name, email, avatar_url FROM profiles WHERE user_id = ?")
          .get(otherId);

        const profiles: Record<string, unknown> = {};
        if (other) profiles[otherId] = other;
        profiles[user.id] = db
          .prepare("SELECT user_id, username, display_name, email, avatar_url FROM profiles WHERE user_id = ?")
          .get(user.id);

        return jsonResponse({ messages, profiles });
      },

      POST: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const { content, reply_to } = await parseJsonBody<{ content: string; reply_to?: string }>(request);
        const text = content?.trim();
        if (!text) return errorResponse("Пустое сообщение");

        const db = getDb();
        const conv = db
          .prepare("SELECT * FROM dm_conversations WHERE id = ?")
          .get(params.conversationId) as { user_a: string; user_b: string } | undefined;

        if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
          return errorResponse("Forbidden", 403);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO dm_messages (id, conversation_id, sender_id, content, reply_to) VALUES (?, ?, ?, ?, ?)`
        ).run(id, params.conversationId, user.id, text, reply_to ?? null);
        db.prepare("UPDATE dm_conversations SET last_message_at = ? WHERE id = ?").run(now, params.conversationId);

        return jsonResponse({ ok: true, id });
      },
    },
  },
});
