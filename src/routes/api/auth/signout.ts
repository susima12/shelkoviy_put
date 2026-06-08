import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async () => jsonResponse({ ok: true }),
    },
  },
});
