/**
 * Проверка подключения к Supabase перед деплоем.
 * Запуск: node scripts/check-supabase.mjs
 * (нужен файл .env в корне проекта)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]+)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    console.warn("⚠ Файл .env не найден — используются переменные окружения системы");
  }
}

loadEnv();

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n═══ Проверка Supabase ═══\n");

if (!url) {
  console.error("✗ SUPABASE_URL не задан");
  process.exit(1);
}
console.log("URL:", url);

if (!anon) {
  console.error("✗ SUPABASE_PUBLISHABLE_KEY не задан");
  process.exit(1);
}

try {
  const res = await fetch(`${url}/rest/v1/competitions?select=slug,name&order=display_order`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (!res.ok) {
    console.error("✗ REST API:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log(`✓ REST API OK — конкурсов в базе: ${data.length}`);
  data.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.slug})`));
  if (data.length !== 6) {
    console.warn(`\n⚠ Ожидается 6 конкурсов. Выполните supabase/full-setup.sql в SQL Editor`);
  }
} catch (e) {
  console.error("✗ Нет связи с Supabase:", e.message);
  console.error("\n  Проверьте: проект создан? URL и ключи верные? Проект не приостановлен?");
  process.exit(1);
}

if (service) {
  console.log("✓ SUPABASE_SERVICE_ROLE_KEY задан (админ-API будет работать)");
} else {
  console.warn("⚠ SUPABASE_SERVICE_ROLE_KEY не задан — /api/public/setup-admins не сработает");
}

console.log("\n✓ Готово к деплою на Render\n");
