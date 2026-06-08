import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { createToken, errorResponse, hashPassword, jsonResponse, parseJsonBody } from "@/server/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password, display_name } = await parseJsonBody<{
          email: string;
          password: string;
          display_name: string;
        }>(request);

        const mail = email?.trim().toLowerCase();
        const name = display_name?.trim();

        if (!mail || !EMAIL_RE.test(mail)) return errorResponse("Некорректный email");
        if (!PASSWORD_RE.test(password || "")) return errorResponse("Пароль: 8–72 символа, буква и цифра");
        if (!name || name.length < 2) return errorResponse("Имя: от 2 до 80 символов");

        const db = getDb();
        const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(mail);
        if (exists) return errorResponse("User already registered", 409);

        const userId = crypto.randomUUID();
        const pwHash = await hashPassword(password);
        const username = mail.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 30) || `user_${userId.slice(0, 6)}`;

        db.prepare("INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)").run(
          userId,
          mail,
          pwHash,
          name
        );
        db.prepare(
          "INSERT INTO profiles (user_id, email, display_name, username) VALUES (?, ?, ?, ?)"
        ).run(userId, mail, name, username.length >= 3 ? username : `${username}_${userId.slice(0, 4)}`);

        const user = { id: userId, email: mail, display_name: name, is_admin: false, admin_competition_id: null };
        const token = await createToken(user);
        return jsonResponse({ user, token }, 201);
      },
    },
  },
});
