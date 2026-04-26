# Telegram-бот: вставка счёта в `expenses`

Подсветка «новых» и вкладка «Счета» зависят от реального поля **`status`** в таблице `expenses`. Для новых записей в коде веба используется **`'new'`**.

При сохранении счёта ботом обязательно передавайте **`status: 'new'`** (и остальные обязательные поля, принятые в вашей схеме).

Пример (адаптируйте поля под ваш `insert`):

```ts
const { error } = await supabase.from('expenses').insert({
  file_url: publicUrl,
  file_name: fileName,
  amount: 0,
  category: 'Прочее',
  comment: null,
  status: 'new',
  // при наличии в таблице:
  // subcategory, user_id, user_name, ...
})

if (error) throw error
```

Если поле `status` отсутствует в БД, выполните `sql/add_status_to_expenses.sql` в Supabase.
