import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/profiles/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const profile = db
          .prepare("SELECT * FROM profiles WHERE user_id = ?")
          .get(user.id);

        return jsonResponse({ profile: profile ?? null });
      },

      PATCH: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const body = await parseJsonBody<{
          display_name?: string;
          username?: string;
          bio?: string;
          avatar_url?: string;
        }>(request);

        const db = getDb();

        if (body.username) {
          const normalized = body.username.trim().toLowerCase();
          const clash = db
            .prepare("SELECT user_id FROM profiles WHERE username = ? AND user_id != ?")
            .get(normalized, user.id);
          if (clash) return errorResponse("Этот ID уже занят", 409);
        }

        const existing = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id) as Record<string, unknown> | undefined;

        if (!existing) {
          db.prepare(
            "INSERT INTO profiles (user_id, email, display_name, username, bio, avatar_url) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            user.id,
            user.email,
            body.display_name ?? user.display_name ?? user.email,
            body.username ?? user.email.split("@")[0],
            body.bio ?? null,
            body.avatar_url ?? null
          );
        } else {
          db.prepare(`
            UPDATE profiles SET
              display_name = COALESCE(?, display_name),
              username = COALESCE(?, username),
              bio = COALESCE(?, bio),
              avatar_url = COALESCE(?, avatar_url)
            WHERE user_id = ?
          `).run(
            body.display_name ?? null,
            body.username ? body.username.trim().toLowerCase() : null,
            body.bio !== undefined ? body.bio : null,
            body.avatar_url ?? null,
            user.id
          );
        }

        if (body.display_name) {
          db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(body.display_name, user.id);
        }

        const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id);
        return jsonResponse({ profile });
      },
    },
  },
});
