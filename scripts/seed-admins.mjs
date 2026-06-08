/**
 * Создание админов для каждого конкурса.
 * Запуск: node scripts/seed-admins.mjs
 * Требует SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]+)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}

const ADMIN_PASSWORDS = {
  "teatry-mody": "Mod2026",
  "yunyy-modeler": "Yun2026",
  "teatralnye-kollektivy": "Tea2026",
  vokal: "Vok2026",
  horeograph: "Hor2026",
  instrument: "Ins2026",
};

loadEnv();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: comps, error: cErr } = await sb.from("competitions").select("id, slug, name");
if (cErr) {
  console.error(cErr);
  process.exit(1);
}

const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
const out = [];

for (const c of comps ?? []) {
  const password = ADMIN_PASSWORDS[c.slug];
  if (!password) continue;
  const email = `admin_${c.slug}@festival.local`;

  let userId = list?.users?.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data: created, error: e } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Admin · ${c.name}` },
    });
    if (e) {
      out.push({ email, status: "fail", error: e.message });
      continue;
    }
    userId = created.user.id;
  } else {
    await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  const { data: existing } = await sb
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (existing) {
    await sb.from("user_roles").update({ competition_id: c.id }).eq("id", existing.id);
  } else {
    await sb.from("user_roles").insert({ user_id: userId, role: "admin", competition_id: c.id });
  }
  out.push({ comp: c.name, email, password });
}

console.log(JSON.stringify(out, null, 2));
