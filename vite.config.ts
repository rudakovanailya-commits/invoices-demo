import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** CI (pages.yml) задаёт VITE_BASE_PATH; иначе — /invoices-demo/ для GitHub Project Pages. */
function baseUrl(): string {
  const raw = process.env.VITE_BASE_PATH?.trim()
  if (!raw) return '/invoices-demo/'
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}

export default defineConfig({
  base: baseUrl(),
  plugins: [react()],
})