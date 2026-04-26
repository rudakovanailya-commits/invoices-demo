import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

type User = {
  id: string
  chat_id: string | number | null
  username: string | null
  role: string | null
  is_active: boolean
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([])

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    if (data) setUsers(data as User[])
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const toggleUser = async (id: string, value: boolean) => {
    await supabase.from('users').update({ is_active: value }).eq('id', id)
    void loadUsers()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Пользователи</Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>username</TableCell>
              <TableCell>chat_id</TableCell>
              <TableCell>role</TableCell>
              <TableCell>is_active</TableCell>
              <TableCell align="right">действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell
                  sx={{
                    color: user.is_active ? 'success.main' : 'text.disabled',
                    fontWeight: user.is_active ? 600 : 400,
                  }}
                >
                  {user.username ?? '—'}
                </TableCell>
                <TableCell
                  sx={{
                    color: user.is_active ? 'success.main' : 'text.disabled',
                    fontWeight: user.is_active ? 600 : 400,
                  }}
                >
                  {user.chat_id ?? '—'}
                </TableCell>
                <TableCell
                  sx={{
                    color: user.is_active ? 'success.main' : 'text.disabled',
                  }}
                >
                  {user.role ?? '—'}
                </TableCell>
                <TableCell
                  sx={{
                    color: user.is_active ? 'success.main' : 'text.disabled',
                  }}
                >
                  {user.is_active ? 'да' : 'нет'}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void toggleUser(user.id, !user.is_active)}
                  >
                    {user.is_active ? 'Отключить' : 'Включить'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
