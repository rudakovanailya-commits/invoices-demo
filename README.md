# Прототип: учет входящих счетов (Supabase + Storage)

Минимальный прототип без авторизации:

- **Сотрудник**: загружает счет (PDF/JPG/PNG) + сумма + статья + комментарий.
- **Бухгалтер**: видит список, открывает файл, меняет статус (`new/approved/rejected`).

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

## Примечания

- Категории расходов захардкожены в `src/screens/SubmitInvoice.tsx`.
- Файл загружается в Storage `invoices`, затем в таблицу пишется `file_url` (public URL).
