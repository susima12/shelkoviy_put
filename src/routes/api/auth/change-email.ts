import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody, verifyPassword } from "@/server/auth";

export const Route = createFileRoute("/api/auth/change-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const { current_password, new_email } = await parseJsonBody<{
          current_password: string;
          new_email: string;
        }>(request);

        const mail = new_email?.trim().toLowerCase();
        if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          return errorResponse("Некорректный email");
        }

        const db = getDb();
        const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
        if (!(await verifyPassword(current_password, row.password_hash))) {
          return errorResponse("Текущий пароль неверный", 401);
        }

        const clash = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(mail, user.id);
        if (clash) return errorResponse("Email уже занят", 409);

        db.prepare("UPDATE users SET email = ? WHERE id = ?").run(mail, user.id);
        db.prepare("UPDATE profiles SET email = ? WHERE user_id = ?").run(mail, user.id);
        return jsonResponse({ ok: true, email: mail });
      },
    },
  },
});
