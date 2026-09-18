import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://hokkaido.manjung.my'),
  title: "Hokkaido Inti Jebok — Gebu di Luar, Creamy di Dalam",
  description: "Nikmati kek muffin kastard melimpah gebu. Tempah mudah untuk penghantaran COD atau ambil sendiri di Stadium Manjung!",
  openGraph: {
    title: "Hokkaido Inti Jebok — Gebu di Luar, Creamy di Dalam",
    description: "Nikmati kek muffin kastard melimpah gebu. Tempah mudah untuk penghantaran COD atau ambil sendiri di Stadium Manjung!",
    url: "https://hokkaido.manjung.my",
    siteName: "Hokkaido Inti Jebok",
    images: [
      {
        url: "/images/hokkaido-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Hokkaido Inti Jebok Muffin Custard",
      },
    ],
    locale: "ms_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hokkaido Inti Jebok",
    description: "Kek muffin inti kastard gebu dan melimpah.",
    images: ["/images/hokkaido-banner.jpg"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.className} bg-white text-slate-900`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}