import { createFileRoute } from "@tanstack/react-router";
import { getDb, seedAdmins } from "@/server/db";
import { jsonResponse } from "@/server/auth";

export const Route = createFileRoute("/api/public/setup-admins")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await seedAdmins(getDb());
          return jsonResponse({ ok: true, result });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return jsonResponse({ ok: false, error: msg }, 500);
        }
      },
      POST: async () => {
        try {
          const result = await seedAdmins(getDb());
          return jsonResponse({ ok: true, result });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return jsonResponse({ ok: false, error: msg }, 500);
        }
      },
    },
  },
});
