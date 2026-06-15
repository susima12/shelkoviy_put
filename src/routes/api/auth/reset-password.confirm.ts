import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, hashPassword, jsonResponse, parseJsonBody } from "@/server/auth";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const Route = createFileRoute("/api/auth/reset-password/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { token, password } = await parseJsonBody<{ token: string; password: string }>(request);
        const raw = token?.trim();
        if (!raw) return errorResponse("Ссылка для сброса недействительна");
        if (!PASSWORD_RE.test(password || "")) {
          return errorResponse("Пароль: 8–72 символа, минимум одна буква и одна цифра");
        }

        const db = getDb();
        const tokenHash = hashToken(raw);
        const row = db
          .prepare(
            `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
             WHERE token_hash = ? LIMIT 1`
          )
          .get(tokenHash) as
          | { id: string; user_id: string; expires_at: string; used_at: string | null }
          | undefined;

        if (!row || row.used_at) return errorResponse("Ссылка для сброса недействительна или уже использована", 400);
        if (new Date(row.expires_at).getTime() < Date.now()) {
          return errorResponse("Ссылка истекла. Запросите сброс пароля заново.", 400);
        }

        const pwHash = await hashPassword(password);
        db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(pwHash, row.user_id);
        db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);

        return jsonResponse({ ok: true, message: "Пароль обновлён. Теперь можно войти с новым паролем." });
      },
    },
  },
});
