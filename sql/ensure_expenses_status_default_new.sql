-- Выполнить в Supabase SQL Editor, если при вставке без status или из старого кода
-- попадало значение in_progress: зафиксировать default для колонки.
alter table public.expenses
  alter column status set default 'new';
