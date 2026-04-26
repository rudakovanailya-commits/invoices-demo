-- Выполнить в Supabase SQL Editor
alter table public.expenses
  add column if not exists status text default 'new';
