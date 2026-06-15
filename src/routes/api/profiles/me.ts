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
        const row = db
          .prepare("SELECT * FROM profiles WHERE user_id = ?")
          .get(user.id) as Record<string, unknown> | null;

        if (row?.avatar_url && String(row.avatar_url).startsWith("/uploads/avatars/")) {
          const v = String(row.avatar_url).includes("?") ? String(row.avatar_url).split("?")[1] : "";
          row.avatar_url = `/api/profiles/avatar/${user.id}${v ? `?${v}` : ""}`;
        }

        return jsonResponse({ profile: row ?? null });
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
          if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
            return errorResponse("ID: a-z, 0-9, _, 3–30 символов");
          }
          const clash = db
            .prepare("SELECT user_id FROM profiles WHERE username = ? AND user_id != ?")
            .get(normalized, user.id);
          if (clash) return errorResponse("Этот ID уже занят", 409);
        }

        const existing = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id) as Record<string, unknown> | undefined;

        if (body.display_name !== undefined) {
          const name = body.display_name.trim();
          if (name.length < 2 || name.length > 80) {
            return errorResponse("Имя: от 2 до 80 символов");
          }
        }

        const displayName =
          body.display_name !== undefined ? body.display_name.trim() : undefined;
        const username =
          body.username !== undefined ? body.username.trim().toLowerCase() || null : undefined;
        const bio = body.bio !== undefined ? body.bio.trim() || null : undefined;
        const avatarUrl = body.avatar_url !== undefined ? body.avatar_url || null : undefined;

        if (!existing) {
          db.prepare(
            "INSERT INTO profiles (user_id, email, display_name, username, bio, avatar_url) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(
            user.id,
            user.email,
            displayName ?? user.display_name ?? user.email,
            username ?? null,
            bio ?? null,
            avatarUrl ?? null
          );
        } else {
          const sets: string[] = [];
          const vals: unknown[] = [];
          if (displayName !== undefined) {
            sets.push("display_name = ?");
            vals.push(displayName);
          }
          if (username !== undefined) {
            sets.push("username = ?");
            vals.push(username);
          }
          if (bio !== undefined) {
            sets.push("bio = ?");
            vals.push(bio);
          }
          if (avatarUrl !== undefined) {
            sets.push("avatar_url = ?");
            vals.push(avatarUrl);
          }
          if (sets.length) {
            vals.push(user.id);
            db.prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE user_id = ?`).run(...vals);
          }
        }

        if (displayName) {
          db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(displayName, user.id);
        }

        const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id);
        return jsonResponse({ profile });
      },
    },
  },
});
