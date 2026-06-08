/**
 * Создаёт администраторов конкурсов в SQLite.
 * Запуск: npm run seed:admins
 * Или откройте в браузере: GET /api/public/setup-admins
 */
const base = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "http://localhost:3000";

const res = await fetch(`${base}/api/public/setup-admins`);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
if (!data.ok) process.exit(1);
