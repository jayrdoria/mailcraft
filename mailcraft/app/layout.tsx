import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/providers'

export const metadata: Metadata = {
  title: 'MailCraft',
  description: 'Internal email template editor for Stakes and X7 Casino',
  icons: {
    icon: '/mailcraft/logo.png',
    shortcut: '/mailcraft/logo.png',
    apple: '/mailcraft/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
