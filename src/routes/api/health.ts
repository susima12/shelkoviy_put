import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const hasAnonKey = !!(process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

        let supabaseOk = false;
        let supabaseError: string | null = null;

        if (url && hasAnonKey) {
          try {
            const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
            const res = await fetch(`${url}/rest/v1/competitions?select=slug&limit=1`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
              signal: AbortSignal.timeout(8000),
            });
            supabaseOk = res.ok;
            if (!res.ok) supabaseError = `HTTP ${res.status}`;
          } catch (e) {
            supabaseError = e instanceof Error ? e.message : String(e);
          }
        } else {
          supabaseError = "Missing SUPABASE_URL or keys";
        }

        const body = {
          ok: supabaseOk,
          service: "shelk-put",
          supabase: { connected: supabaseOk, url: url ?? null, hasServiceKey, error: supabaseError },
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: supabaseOk ? 200 : 503,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
