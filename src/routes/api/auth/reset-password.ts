import { createHash, randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, jsonResponse, parseJsonBody } from "@/server/auth";
import { isMailConfigured, sendPasswordResetEmail } from "@/server/mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appBaseUrl(request: Request): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

const GENERIC_OK =
  "Если аккаунт с этим email зарегистрирован, мы отправили письмо со ссылкой для сброса пароля.";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      GET: async () => {
        return jsonResponse({ enabled: isMailConfigured() });
      },

      POST: async ({ request }) => {
        if (!isMailConfigured()) {
          return errorResponse(
            "Автоматический сброс пароля недоступен. Напишите в оргкомитет: zayavka@shelk-put.com",
            503
          );
        }

        const { email } = await parseJsonBody<{ email: string }>(request);
        const mail = email?.trim().toLowerCase();
        if (!mail || !EMAIL_RE.test(mail)) return errorResponse("Некорректный email");

        const db = getDb();
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(mail) as { id: string } | undefined;

        if (user) {
          const rawToken = randomBytes(32).toString("base64url");
          const tokenHash = hashToken(rawToken);
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

          db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);
          db.prepare(
            "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
          ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt);

          const resetUrl = `${appBaseUrl(request)}/reset-password?token=${encodeURIComponent(rawToken)}`;
          const { sent } = await sendPasswordResetEmail(mail, resetUrl, request);
          if (!sent) {
            return errorResponse("Не удалось отправить письмо. Попробуйте позже или напишите в оргкомитет.", 503);
          }
        }

        return jsonResponse({ ok: true, message: GENERIC_OK });
      },
    },
  },
});
