'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { initTheme, useThemeStore } from '@/lib/stores/themeStore'

function ThemeInit() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    initTheme()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInit />
      {children}
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  )
}
