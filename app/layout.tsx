import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hokkaido Inti Jebok Order System',
  description: 'Hyper-local COD & Pickup order management for Hokkaido Inti Jebok - Kek Muffin Inti Custard -',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-900`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}