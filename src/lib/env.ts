export function requireEnv(name: string): string {
  const value = (import.meta as any).env?.[name] as string | undefined
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. Локально: файл .env.local. Для GitHub Pages: ` +
        `Settings → Secrets and variables → Actions — добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, ` +
        `затем заново запустите workflow деплоя.`,
    )
  }
  return value
}

