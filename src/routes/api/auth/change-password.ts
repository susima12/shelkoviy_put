import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, hashPassword, jsonResponse, parseJsonBody, verifyPassword } from "@/server/auth";

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const { current_password, new_password } = await parseJsonBody<{
          current_password: string;
          new_password: string;
        }>(request);

        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(new_password || "")) {
          return errorResponse("Пароль: 8–72 символа, буква и цифра");
        }

        const db = getDb();
        const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
        if (!(await verifyPassword(current_password, row.password_hash))) {
          return errorResponse("Текущий пароль неверный", 401);
        }

        const hash = await hashPassword(new_password);
        db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
        return jsonResponse({ ok: true });
      },
    },
  },
});
