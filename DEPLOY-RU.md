# Деплой «Шёлковый путь» на Render — с нуля

Сайт: **фронтенд + API + SQLite** в одном Node-процессе. Supabase **не нужен**.

---

## Шаг 0. Что должно быть установлено

- [Node.js 20+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- Аккаунт [GitHub](https://github.com)
- Аккаунт [Render](https://render.com) (бесплатный план подойдёт для старта)

---

## Шаг 1. Проверка проекта на компьютере

Откройте терминал в папке проекта:

```powershell
cd "C:\Users\Welcome\Desktop\diplomiy_pravki_sait\shelk-put-main"
npm install
npm run build
```

Если в конце видите `✓ built` — проект готов к деплою.

---

## Шаг 2. GitHub — загрузить код

### 2.1. Создайте пустой репозиторий на GitHub

1. [github.com/new](https://github.com/new)
2. Имя, например: `shelk-put`
3. **Без** README, .gitignore и license (они уже есть в проекте)
4. Нажмите **Create repository**

### 2.2. Инициализируйте git и отправьте код

```powershell
cd "C:\Users\Welcome\Desktop\diplomiy_pravki_sait\shelk-put-main"

git init
git add .
git commit -m "Шёлковый путь 2026: SQLite, положение, админка, конкурсы"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/shelk-put.git
git push -u origin main
```

Замените `ВАШ_ЛОГИН` на свой GitHub-логин. При `git push` введите логин и **Personal Access Token** (не пароль от GitHub).

> **Важно:** коммитьте только папку `shelk-put-main`, не всю домашнюю директорию Windows.

---

## Шаг 3. Render — создать сервис

### Вариант А (рекомендуется): Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Подключите GitHub и выберите репозиторий `shelk-put`
3. Render найдёт `render.yaml` и предложит создать сервис `shelk-put`
4. На шаге переменных введите **`JWT_SECRET`** (длинная случайная строка, минимум 32 символа)
5. **Apply**

### Вариант Б: вручную (Web Service)

| Поле | Значение |
|------|----------|
| Environment | **Node** |
| Region | **Frankfurt** (ближе к России) |
| Branch | `main` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Plan | Free |

**Health Check Path:** `/api/health`

---

## Шаг 4. Переменные окружения на Render

**Dashboard → shelk-put → Environment**

| Переменная | Значение | Обязательно |
|------------|----------|-------------|
| `JWT_SECRET` | Случайная строка 32+ символов | **Да** |
| `DATABASE_PATH` | `./data/festival.db` | Да (есть в render.yaml) |
| `NODE_ENV` | `production` | Да |
| `NODE_VERSION` | `20` | Да (есть в render.yaml) |

### Удалите старые переменные Supabase (если остались):

- `SUPABASE_URL`, `VITE_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

После изменения env нажмите **Save** — Render перезапустит сервис.

---

## Шаг 5. Дождаться деплоя

1. Вкладка **Logs** — ждите строку вроде `Server listening on...`
2. Статус сервиса должен стать **Live** (зелёный)
3. Откройте health check:

```
https://shelk-put.onrender.com/api/health
```

Ожидаемый ответ:

```json
{
  "ok": true,
  "database": { "connected": true, "competitions": 6, "admins": 6 }
}
```

Если `admins: 6` — администраторы созданы автоматически при старте.

---

## Шаг 6. Проверка сайта

| URL | Что проверить |
|-----|----------------|
| `/` | Главная, логотип, даты 16–19 апреля |
| `/competitions` | 6 конкурсов, кнопка «Подробнее» |
| `/competitions/teatry-mody` | Страница конкурса с координаторами |
| `/auth` | Регистрация и вход |
| `/admin` | Вход администратора |
| `/jury` | Жюри и положение |
| `/about` | Положение 2026 |

### Вход в админку (`/admin`)

| Конкурс | Email | Пароль |
|---------|-------|--------|
| Театры моды | admin_teatry-mody@festival.local | Mod2026 |
| Юный модельер | admin_yunyy-modeler@festival.local | Yun2026 |
| Театральные коллективы | admin_teatralnye-kollektivy@festival.local | Tea2026 |
| Вокал | admin_vokal@festival.local | Vok2026 |
| Хореография | admin_horeograph@festival.local | Hor2026 |
| Инструментальное | admin_instrument@festival.local | Ins2026 |

---

## Шаг 7. Свой домен shelk-put.com (опционально)

1. Render → **Settings** → **Custom Domains** → Add `shelk-put.com` и `www.shelk-put.com`
2. У регистратора домена добавьте DNS-записи, которые покажет Render (обычно CNAME на `*.onrender.com`)
3. Дождитесь SSL (Let's Encrypt) — до 24 часов

---

## Обновление сайта после правок

```powershell
git add .
git commit -m "описание изменений"
git push origin main
```

Render пересоберёт проект автоматически (3–5 минут).

---

## Важно: данные на Free-плане

На бесплатном Render файл SQLite **может сбрасываться** при полном передеплое.

- Конкурсы, жюри и админы — **восстанавливаются автоматически**
- **Заявки пользователей** могут пропасть после передеплоя

Чтобы сохранять заявки надёжно:
- Подключите **Persistent Disk** (платный план) и `DATABASE_PATH=/var/data/festival.db`
- Или регулярно экспортируйте CSV из админ-панели

---

## Локальная разработка

```powershell
copy .env.example .env
# Отредактируйте JWT_SECRET в .env

npm install
npm run dev
```

Сайт: http://localhost:3000  
База создаётся в `data/festival.db`.

---

## Частые ошибки

| Проблема | Решение |
|----------|---------|
| Build failed | Смотрите Logs на Render; локально запустите `npm run build` |
| «Нет связи с сервером» при входе | Проверьте `JWT_SECRET` на Render |
| Админка: неверный пароль | Откройте `/api/health` — должно быть `admins: 6` |
| Сайт долго грузится (Free) | Первый запрос после простоя — cold start 30–60 сек |
| 502 после деплоя | Подождите 2–3 мин; проверьте Start Command: `npm start` |
