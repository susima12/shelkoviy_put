import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole } from "@/server/db";
import { createToken, errorResponse, jsonResponse, parseJsonBody, verifyPassword } from "@/server/auth";

export const Route = createFileRoute("/api/auth/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password } = await parseJsonBody<{ email: string; password: string }>(request);
        if (!email || !password) return errorResponse("Email и пароль обязательны");

        const mail = email.trim().toLowerCase();
        const db = getDb();
        const row = db
          .prepare("SELECT id, email, password_hash, display_name FROM users WHERE email = ?")
          .get(mail) as
          | { id: string; email: string; password_hash: string; display_name: string | null }
          | undefined;

        if (!row || !(await verifyPassword(password, row.password_hash))) {
          return errorResponse("Invalid login credentials", 401);
        }

        const adminRole = getUserAdminRole(db, row.id);
        const user = {
          id: row.id,
          email: row.email,
          display_name: row.display_name,
          is_admin: !!adminRole,
          admin_competition_id: adminRole?.competition_id ?? null,
        };
        const token = await createToken(user);
        return jsonResponse({ user, token });
      },
    },
  },
});
