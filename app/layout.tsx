import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Vinted Dashboard',
  description: 'Boekhouding dashboard voor Vinted resell',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className="bg-gray-900 text-white min-h-screen">
        <main className="pb-24 min-h-screen">{children}</main>
        <Navigation />
      </body>
    </html>
  )
}
