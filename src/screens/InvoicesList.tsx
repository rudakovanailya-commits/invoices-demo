import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { WorkSheet } from 'xlsx'

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

const accountantFieldSx = (t: { palette: { mode: 'light' | 'dark'; primary: { main: string } } }) => ({
  '& .MuiOutlinedInput-root': {
    transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.22)}`,
  },
})

type Expense = {
  id: string
  file_url: string
  file_name: string | null
  amount: number | null
  category: string | null
  subcategory?: string | null
  comment: string | null
  accountant_comment: string | null
  company: string | null
  status: string | null
  created_at: string
}

function notifyExpensesChanged() {
  window.dispatchEvent(new Event('invoices-refresh'))
}

function expenseRowsForExport(data: Expense[]) {
  return data.map((item) => ({
    Дата: new Date(item.created_at).toLocaleString(),
    Файл: item.file_name || '',
    Категория: item.category || '',
    Подкатегория: item.subcategory || '',
    Компания: item.company || '',
    Комментарий: item.comment || '',
    'Комментарий бухгалтера': item.accountant_comment || '',
    Статус: item.status || '',
    Ссылка: item.file_url || '',
  }))
}

function applySheetColumnWidths(worksheet: WorkSheet, xlsx: typeof import('xlsx')) {
  const { utils } = xlsx
  const ref = worksheet['!ref']
  if (!ref) return
  const range = utils.decode_range(ref)
  const cols: { wch: number }[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = 10
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = worksheet[utils.encode_cell({ r, c })]
      const s = cell?.v != null ? String(cell.v) : ''
      if (s.length > maxLen) maxLen = s.length
    }
    cols.push({ wch: Math.min(maxLen + 2, 60) })
  }
  worksheet['!cols'] = cols
}

const ADMIN_PASSWORD = '1234'

type InvoicesListProps = {
  isAdmin: boolean
  onAdminLogin: () => void
  onAdminLogout: () => void
  /** Синхронизирует с App индикатор «есть новые» (тот же смысл, что items.some(i => i.status === 'new')) */
  onHasNewChange?: (hasNew: boolean) => void
}

export default function InvoicesList({
  isAdmin,
  onAdminLogin,
  onAdminLogout,
  onHasNewChange,
}: InvoicesListProps) {
  const [items, setItems] = useState<Expense[]>([])
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  const companies = useMemo(
    () => [...new Set(items.map((i) => i.company).filter(Boolean) as string[])],
    [items]
  )

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        return !selectedCompany || item.company === selectedCompany
      }),
    [items, selectedCompany]
  )

  const hasNew = useMemo(
    () => items.some((i) => i.status === 'new'),
    [items]
  )

  useEffect(() => {
    onHasNewChange?.(hasNew)
  }, [hasNew, onHasNewChange])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('expenses load:', error)
      }
      return
    }

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

  const dataToExport = filteredItems || items

  function handleExport() {
    if (!dataToExport.length) {
      alert('Нет данных для выгрузки')
      return
    }
    const rows = expenseRowsForExport(dataToExport)

    const csv = [
      Object.keys(rows[0]).join(','),
      ...rows.map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'expenses.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleExportExcel() {
    if (!dataToExport || dataToExport.length === 0) {
      alert('Нет данных для выгрузки')
      return
    }
    const XLSX = await import('xlsx')
    const rows = expenseRowsForExport(dataToExport)
    const worksheet = XLSX.utils.json_to_sheet(rows)
    applySheetColumnWidths(worksheet, XLSX)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Счета')
    XLSX.writeFile(workbook, 'expenses.xlsx')
  }

  function tryLogin() {
    if (loginPassword === ADMIN_PASSWORD) {
      onAdminLogin()
      setLoginOpen(false)
      setLoginPassword('')
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Вход для бухгалтера</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryLogin()
            }}
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={tryLogin}>
            Войти
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h6">Список счетов</Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="filter-company-label">Компания</InputLabel>
            <Select
              labelId="filter-company-label"
              label="Компания"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleExport}>
            📥 Скачать CSV
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              void handleExportExcel()
            }}
          >
            📥 Скачать Excel
          </Button>
        </Box>
      </Box>

      {isAdmin ? (
        <Alert
          severity="success"
          variant="outlined"
          sx={{
            alignItems: 'center',
            borderWidth: 2,
            fontWeight: 500,
            '& .MuiAlert-icon': { fontSize: 28 },
          }}
          action={
            <Button color="success" size="small" variant="contained" onClick={onAdminLogout}>
              Выйти из режима
            </Button>
          }
        >
          Режим бухгалтера включён — доступны кнопки по счетам и комментарии.
        </Alert>
      ) : (
        <Button
          variant="contained"
          color="primary"
          size="medium"
          onClick={() => setLoginOpen(true)}
          sx={(theme) => ({
            alignSelf: 'stretch',
            maxWidth: 360,
            py: 1.25,
            fontWeight: 700,
            fontSize: '1rem',
            boxShadow: theme.shadows[4],
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          })}
        >
          Вход для бухгалтера
        </Button>
      )}

      {filteredItems.map((item) => (
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

            <Typography sx={{ mt: 2 }} component="p" variant="body1">
              Статус: {item.status === 'new' ? 'Новый' : item.status ?? '—'}
            </Typography>

            {isAdmin && (
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
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    label="Компания"
                    defaultValue={item.company || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      supabase
                        .from('expenses')
                        .update({ company: v || null })
                        .eq('id', item.id)
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id ? { ...x, company: v || null } : x
                        )
                      )
                    }}
                    sx={accountantFieldSx}
                  />
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
                    sx={accountantFieldSx}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
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
