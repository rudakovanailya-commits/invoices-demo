export function requireEnv(name: string): string {
  const value = (import.meta as any).env?.[name] as string | undefined
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}. Создайте .env.local`)
  }
  return value
}

