import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CRM Panel',
  description: 'WhatsApp CRM ve Randevu Yönetimi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
