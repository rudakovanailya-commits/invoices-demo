import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Ошибка интерфейса
            </Typography>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {this.state.error.message}
            </Typography>
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
