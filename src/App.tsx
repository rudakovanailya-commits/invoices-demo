import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Container,
  CssBaseline,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PeopleIcon from '@mui/icons-material/People'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'

import SubmitInvoice from './screens/SubmitInvoice'
import InvoicesList from './screens/InvoicesList'
import { ErrorBoundary } from './components/ErrorBoundary'
import { supabase } from './lib/supabaseClient'

const UsersAdmin = lazy(() => import('./screens/UsersAdmin'))

type TabKey = 'submit' | 'list' | 'users'

function App() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true')
  const [tab, setTab] = useState<TabKey>('submit')
  const prevTabRef = useRef<TabKey | null>(null)
  const [hasNewInvoices, setHasNewInvoices] = useState(false)
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme_mode')
    return saved === 'dark' ? 'dark' : 'light'
  })

  const refreshNewInvoicesFlag = useCallback(async () => {
    const { count, error } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
    if (error) return
    setHasNewInvoices((count ?? 0) > 0)
  }, [])

  useEffect(() => {
    void refreshNewInvoicesFlag()
  }, [tab, refreshNewInvoicesFlag])

  useEffect(() => {
    if (!isAdmin && tab === 'users') {
      setTab('list')
    }
  }, [isAdmin, tab])

  /* Уход со страницы «Отправить счёт» → сброс режима бухгалтера (отдельно от пользовательской зоны) */
  useEffect(() => {
    if (prevTabRef.current === null) {
      prevTabRef.current = tab
      return
    }
    const prev = prevTabRef.current
    if (prev === 'submit' && tab !== 'submit') {
      localStorage.removeItem('isAdmin')
      setIsAdmin(false)
    }
    prevTabRef.current = tab
  }, [tab])

  useEffect(() => {
    const onRefresh = () => {
      void refreshNewInvoicesFlag()
    }
    window.addEventListener('invoices-refresh', onRefresh)
    return () => window.removeEventListener('invoices-refresh', onRefresh)
  }, [refreshNewInvoicesFlag])

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: (theme) => ({
              'html, body, #root': {
                colorScheme: theme.palette.mode,
                /* iOS/Android: стандартная тап-подсветка на тёмном фоне выглядит как тёмный круг */
                WebkitTapHighlightColor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.14)
                    : alpha(theme.palette.common.black, 0.08),
              },
            }),
          },
          MuiOutlinedInput: {
            styleOverrides: {
              input: ({ theme }) => ({
                cursor: 'text',
                caretColor:
                  theme.palette.mode === 'dark'
                    ? theme.palette.primary.light
                    : theme.palette.primary.main,
              }),
            },
          },
          MuiButtonBase: {
            defaultProps: { disableRipple: false },
            styleOverrides: {
              root: { cursor: 'pointer' },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: { cursor: 'pointer' },
            },
          },
          MuiBottomNavigationAction: {
            styleOverrides: {
              root: ({ theme }) => ({
                cursor: 'pointer',
                WebkitTapHighlightColor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.primary.main, 0.12),
              }),
            },
          },
        },
      }),
    [mode],
  )

  function toggleMode() {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme_mode', next)
      return next
    })
  }

  function logoutAdmin() {
    localStorage.removeItem('isAdmin')
    setIsAdmin(false)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 800 }}>
            Учет входящих счетов
          </Typography>
          {isAdmin && (
            <Button color="inherit" onClick={logoutAdmin} sx={{ mr: 0.5 }}>
              Выйти
            </Button>
          )}
          <IconButton
            onClick={toggleMode}
            aria-label="Переключить тему"
            sx={(theme) => ({
              transition: 'background-color 0.2s ease, transform 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                boxShadow: theme.shadows[4],
                transform: 'scale(1.06)',
              },
            })}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
        <ErrorBoundary>
          {tab === 'submit' ? (
            <SubmitInvoice />
          ) : tab === 'list' ? (
            <InvoicesList
              isAdmin={isAdmin}
              onAdminLogin={() => {
                localStorage.setItem('isAdmin', 'true')
                setIsAdmin(true)
              }}
              onAdminLogout={logoutAdmin}
            />
          ) : (
            <Suspense fallback={<Typography sx={{ p: 2 }}>Загрузка…</Typography>}>
              <UsersAdmin />
            </Suspense>
          )}
        </ErrorBoundary>
      </Container>

      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="sm" disableGutters>
            <BottomNavigation
            value={tab}
            onChange={(_, v) => setTab(v as TabKey)}
            sx={(theme) => ({
              '& .MuiBottomNavigationAction-root': {
                transition: 'transform 0.2s ease, color 0.2s ease, background-color 0.2s ease',
                borderRadius: 1.5,
                py: 0.5,
              },
              '& .MuiBottomNavigationAction-root:hover': {
                bgcolor: 'action.hover',
                transform: 'scale(1.05)',
                boxShadow: theme.shadows[theme.palette.mode === 'dark' ? 6 : 2],
              },
            })}
          >
            <BottomNavigationAction
              label="Отправить счет"
              value="submit"
              icon={<ReceiptLongIcon />}
            />
            <BottomNavigationAction
              label="Счета"
              value="list"
              icon={
                <Badge
                  color="error"
                  variant="dot"
                  overlap="circular"
                  invisible={!hasNewInvoices}
                  sx={(theme) => ({
                    '& .MuiBadge-badge': {
                      minWidth: 10,
                      height: 10,
                      borderRadius: '50%',
                      ...(theme.palette.mode === 'dark' && {
                        bgcolor: 'error.light',
                        boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 8px ${alpha(theme.palette.error.light, 0.9)}`,
                      }),
                    },
                  })}
                >
                  <ListAltIcon color={hasNewInvoices ? 'warning' : 'inherit'} />
                </Badge>
              }
            />
            {isAdmin && (
              <BottomNavigationAction label="Пользователи" value="users" icon={<PeopleIcon />} />
            )}
          </BottomNavigation>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App