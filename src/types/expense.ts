export type ExpenseStatus = 'new' | 'done' | 'paid'

export type Expense = {
  id: string
  created_at: string
  file_url: string
  file_name: string | null
  amount: number
  category: string
  comment: string | null
  status: ExpenseStatus
}

