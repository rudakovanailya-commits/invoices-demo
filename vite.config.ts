import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages (project site): в CI задайте VITE_BASE_PATH=/имя-репозитория/ — иначе пути /assets/ бьют в корень сайта
const base = process.env.VITE_BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
