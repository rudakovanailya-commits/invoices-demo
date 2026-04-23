import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField
} from '@mui/material'
import { alpha } from '@mui/material/styles'

const openLinkButtonSx = {
  cursor: 'pointer',
  minWidth: 'auto',
  textDecoration: 'none',
  transition: 'color 0.22s ease, background-color 0.22s ease, text-decoration 0.18s ease',
  '&:hover': {
    color: 'primary.main',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    bgcolor: 'action.hover',
  },
} as const

type Expense = {
  id: string
  file_url: string
  file_name: string | null
  amount: number | null
  category: string | null
  comment: string | null
  accountant_comment: string | null
  status: string
  created_at: string
}

function notifyExpensesChanged() {
  window.dispatchEvent(new Event('invoices-refresh'))
}

export default function InvoicesList() {
  const [items, setItems] = useState<Expense[]>([])
  const [isAccountant, setIsAccountant] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setItems(data)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('expenses').update({ status }).eq('id', id)
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)))
    notifyExpensesChanged()
  }

  async function deleteItem(id: string) {
    if (!confirm('Удалить счет?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setItems((prev) => prev.filter((x) => x.id !== id))
    notifyExpensesChanged()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Typography variant="h6">Список счетов</Typography>

      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          const pass = prompt('Введите пароль бухгалтера')
          if (pass === '1234') setIsAccountant(true)
        }}
        sx={(theme) => ({
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: theme.shadows[6],
          },
          '&:active': { transform: 'scale(0.99)' },
        })}
      >
        Вход для бухгалтера
      </Button>

      {items.map((item) => (
        <Card
          key={item.id}
          sx={(t) => ({
            position: 'relative',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: item.status === 'new' ? 'warning.main' : 'divider',
            ...(item.status === 'new' && { borderWidth: 2 }),
            bgcolor:
              item.status === 'new'
                ? alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.14 : 0.1)
                : 'background.paper',
            boxShadow: t.shadows[t.palette.mode === 'dark' ? 3 : 1],
            transition:
              'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: t.shadows[t.palette.mode === 'dark' ? 12 : 6],
              borderColor:
                item.status === 'new'
                  ? t.palette.warning.light
                  : alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.45 : 0.35),
            },
          })}
        >

          {item.status === 'new' && (
            <Box
              sx={(theme) => ({
                position: 'absolute',
                top: 10,
                right: 10,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? theme.palette.error.light
                    : theme.palette.error.main,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 10px ${alpha(theme.palette.error.light, 0.85)}`
                    : `0 0 0 1px ${alpha(theme.palette.error.dark, 0.25)}`,
              })}
            />
          )}

          <CardContent>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>
                📄 {item.file_name || 'Счет'}
              </Typography>

              <Button
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={openLinkButtonSx}
              >
                ОТКРЫТЬ
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {new Date(item.created_at).toLocaleString()}
            </Typography>

            {item.amount && (
              <Typography>Сумма: {item.amount} ₽</Typography>
            )}

            {item.category && (
              <Typography>Категория: {item.category}</Typography>
            )}

            {item.comment && (
              <Typography sx={{ mt: 1 }}>
                Комментарий: {item.comment}
              </Typography>
            )}

            {isAccountant && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <TextField
                  fullWidth
                  label="Комментарий бухгалтера"
                  defaultValue={item.accountant_comment || ''}
                  onBlur={(e) => {
                    supabase
                      .from('expenses')
                      .update({ accountant_comment: e.target.value })
                      .eq('id', item.id)
                  }}
                  sx={(t) => ({
                    '& .MuiOutlinedInput-root': {
                      transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.22)}`,
                    },
                  })}
                />

                <Typography sx={{ mt: 2 }}>
                  Статус:{' '}
                  {item.status === 'paid'
                    ? 'Оплачен 💳'
                    : item.status === 'done'
                    ? 'Учтён ✓'
                    : 'Новый'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={() => updateStatus(item.id, 'done')}
                    sx={(theme) => ({
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                      '&:hover': {
                        transform: 'scale(1.04)',
                        boxShadow: theme.shadows[10],
                      },
                      '&:active': { transform: 'scale(0.99)' },
                    })}
                  >
                    УЧТЁН ✓
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => updateStatus(item.id, 'paid')}
                    sx={(theme) => ({
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                      '&:hover': {
                        transform: 'scale(1.04)',
                        boxShadow: theme.shadows[10],
                      },
                      '&:active': { transform: 'scale(0.99)' },
                    })}
                  >
                    ОПЛАЧЕН 💳
                  </Button>

                  <Button
                    color="error"
                    onClick={() => deleteItem(item.id)}
                    sx={(theme) => ({
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                      '&:hover': {
                        transform: 'scale(1.04)',
                        boxShadow: theme.shadows[10],
                      },
                      '&:active': { transform: 'scale(0.99)' },
                    })}
                  >
                    УДАЛИТЬ
                  </Button>
                </Box>
              </Box>
            )}

          </CardContent>
        </Card>
      ))}

    </Box>
  )
}
