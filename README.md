# Прототип: учёт входящих счетов (Supabase + Storage)

Минимальный прототип без авторизации:

- **Сотрудник**: загружает счёт (PDF/JPG/PNG) + сумма + категория + комментарий.
- **Бухгалтер** (после входа по паролю в UI): список, открытие файла, статусы `new` → `done` / `paid`, комментарий бухгалтера (если есть колонка в БД).

## Клонирование и публикация на GitHub

1. Создайте пустой репозиторий на GitHub (без README, если уже есть проект локально).
2. В каталоге `invoices-demo`:

```bash
git init
git add .
git commit -m "Initial commit: invoices-demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/invoices-demo.git
git push -u origin main
```

3. В `package.json` замените `YOUR_USERNAME` в поле `repository.url` на свой логин или удалите блок `repository`, если не нужен.
4. **Не коммитьте** `.env.local` и секреты — они в `.gitignore`. В репозитории только `.env.example`.

## Локальный запуск

1) Установить зависимости:

```bash
npm install
```

2) Создать файл `.env.local` по примеру `.env.example`.

3) Запустить:

```bash
npm run dev
```

## Переменные окружения

Vite читает переменные с префиксом `VITE_`.

Файл `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Настройка Supabase

### 1) Таблица `expenses`

SQL (выполнить в Supabase SQL Editor):

```sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  file_url text not null,
  file_name text,
  amount numeric not null,
  category text not null,
  comment text,
  status text not null default 'new'
);
```

Если таблица уже была без `file_name`, добавьте колонку (в SQL Editor):

```sql
alter table public.expenses add column if not exists file_name text;
```

Если нет поля `status` (для подсветки «новых» и вкладки «Счета»), выполните в репозитории `sql/add_status_to_expenses.sql` или вручную:

```sql
alter table public.expenses
  add column if not exists status text default 'new';
```

Вставка из **Telegram-бота** должна задавать `status: 'new'` — см. `docs/TELEGRAM_BOT.md`.

Опционально, если используете комментарий бухгалтера из UI:

```sql
alter table public.expenses add column if not exists accountant_comment text;
```

В Storage путь к файлу — только латиница/UUID; **человекочитаемое имя** хранится в `file_name`.

### 2) Storage bucket `invoices`

Создайте bucket **`invoices`** в Storage.

Для простого демо без авторизации есть 2 варианта:

- **Вариант A (проще)**: сделать bucket *public* — тогда ссылки `file_url` будут открываться напрямую.
- **Вариант B**: bucket приватный, но тогда нужно выдавать signed URL (в этом прототипе не реализовано).

Рекомендуется **вариант A**.

### 3) Политики (если включен RLS)

Если у вас включен RLS, для демо без авторизации нужно разрешить anon доступ.
Проще всего для прототипа **выключить RLS** на таблице `expenses`.

Если хотите оставить RLS включенным — добавьте политики (на свой риск, это открывает доступ всем):

```sql
alter table public.expenses enable row level security;

create policy "anon select expenses"
on public.expenses for select
to anon
using (true);

create policy "anon insert expenses"
on public.expenses for insert
to anon
with check (true);

create policy "anon update expenses"
on public.expenses for update
to anon
using (true)
with check (true);
```

## Сборка для продакшена

```bash
npm run build
npm run preview   # локальная проверка dist/
```

Статику из `dist/` можно раздавать через любой хостинг (Netlify, Vercel, Cloudflare Pages и т.д.). Укажите те же переменные `VITE_*` в настройках сборки.

### Почему на GitHub Pages пусто / не грузятся стили (белая страница)

1. **Неверный `base` у Vite.** Сайт открывается как `https://user.github.io/имя-репо/`, а скрипты ищутся в `https://user.github.io/assets/...` — 404.  
   В репозитории используется `VITE_BASE_PATH` при сборке (см. `vite.config.ts` и workflow `.github/workflows/pages.yml`).

2. **Не включён деплой через Actions:** **Settings → Pages → Build and deployment → Source: GitHub Actions** (не «Deploy from a branch» без workflow).

3. **Нет секретов Supabase** при сборке в CI: **Settings → Secrets and variables → Actions** — добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (как в `.env.example`).

4. **Сайт в корне** (`username.github.io`): в **Settings → Variables** задайте `VITE_BASE_PATH` = `/` (один слэш).

5. **Workflow не запускался или красный крестик в Actions:** откройте **Actions** → последний запуск **Deploy to GitHub Pages** → лог шага **Build**. Часто: пуш не в ветку `main`/`master`/`develop` (в workflow перечислены эти ветки), нет `package-lock.json` в репозитории, первый деплой ждёт одобрения в **Settings → Environments → github-pages**.

6. **Репозиторий только на компьютере** — пока нет `git push` на GitHub, сайт там не появится.

## Примечания

- Категория по умолчанию при пустом вводе — «Прочее» (`SubmitInvoice.tsx`).
- Файл в Storage `invoices`, в таблице — `file_url`, `file_name` и остальные поля.
- Дубликаты по имени файла блокируются (см. логику в `SubmitInvoice.tsx`).
