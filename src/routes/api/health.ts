import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDb();
          const row = db.prepare("SELECT COUNT(*) as c FROM competitions").get() as { c: number };
          const admins = db.prepare("SELECT COUNT(*) as c FROM user_roles WHERE role = 'admin'").get() as { c: number };
          const body = {
            ok: true,
            service: "shelk-put",
            database: { connected: true, competitions: row.c, admins: admins.c },
            timestamp: new Date().toISOString(),
          };
          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(
            JSON.stringify({ ok: false, service: "shelk-put", error: msg, timestamp: new Date().toISOString() }),
            { status: 503, headers: { "content-type": "application/json" } }
          );
        }
      },
    },
  },
});
