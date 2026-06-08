import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await parseJsonBody<{ email: string }>(request);
        // SMTP не настроен — сообщаем пользователю обратиться в оргкомитет
        return jsonResponse({
          ok: true,
          message: "Если аккаунт существует, обратитесь в оргкомитет: zayavka@shelk-put.com для сброса пароля.",
        });
      },
    },
  },
});
