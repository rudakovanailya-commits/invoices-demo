import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Box,
  Button,
  TextField,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import UploadFileIcon from '@mui/icons-material/UploadFile'

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot) : ''
}

export default function SubmitInvoice() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!file) {
      alert('Выберите файл')
      return
    }

    setLoading(true)

    try {
      const { data: duplicate, error: dupError } = await supabase
        .from('expenses')
        .select('id')
        .eq('file_name', file.name)
        .limit(1)

      if (dupError) throw dupError
      if (duplicate?.length) {
        const confirmUpload = confirm('Похожий счет уже есть. Загрузить еще раз?')
        if (!confirmUpload) {
          return
        }
      }

      const filePath = `${Date.now()}_${crypto.randomUUID()}${fileExtension(file.name)}`

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath)
      const file_url = urlData.publicUrl
      const file_name = file.name

      const parsed = Number(amount)
      const safeAmount =
        amount.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
      const safeCategory = category.trim() || 'Прочее'

      // Веб-форма без auth: subcategory / user_id / user_name — null (как в боте с явными полями)
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          file_url,
          file_name,
          amount: safeAmount,
          category: safeCategory,
          subcategory: null,
          comment: comment.trim() || null,
          user_id: null,
          user_name: null,
          status: 'new',
        })
        .select()

      if (error) {
        console.error('INSERT ERROR:', error)
        alert('Ошибка сохранения счета')
        return
      }
      console.log('INSERT OK:', data)

      window.dispatchEvent(new Event('invoices-refresh'))

      alert('Счет отправлен ✅')

      setFile(null)
      setAmount('')
      setCategory('')
      setComment('')
      if (fileInputRef.current) fileInputRef.current.value = ''

    } catch (e: any) {
      const parts = [e?.message, e?.details, e?.hint].filter(Boolean)
      alert('Ошибка: ' + (parts.length ? parts.join(' — ') : 'Неизвестная ошибка'))
    } finally {
      setLoading(false)
    }
  }

  const textFieldFocusSx = (theme: { palette: { primary: { main: string } } }) => ({
    '& .MuiOutlinedInput-root': {
      transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
    },
    '& .MuiOutlinedInput-root.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">
        Отправка счета
      </Typography>

      <Button
        variant="contained"
        component="label"
        startIcon={<UploadFileIcon />}
        sx={(theme) => ({
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            transform: 'scale(1.04)',
            boxShadow: theme.shadows[8],
          },
          '&:active': { transform: 'scale(0.99)' },
        })}
      >
        Выбрать файл
        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Button>

      <Typography>
        {file ? file.name : 'Файл не выбран'}
      </Typography>

      <TextField
        label="Сумма (необязательно)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        sx={textFieldFocusSx}
      />

      <TextField
        label="Категория"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        sx={textFieldFocusSx}
      />

      <TextField
        label="Комментарий"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={textFieldFocusSx}
      />

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={loading}
        sx={(theme) => ({
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover:not(:disabled)': {
            transform: 'scale(1.04)',
            boxShadow: theme.shadows[10],
          },
          '&:active:not(:disabled)': { transform: 'scale(0.99)' },
        })}
      >
        Отправить
      </Button>
    </Box>
  )
}
