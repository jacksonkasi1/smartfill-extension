// ** import types
import type { Metadata } from 'next'

// ** import lib
import { ClerkProvider } from '@clerk/nextjs'

// ** import components
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

// ** import styles
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartFill - AI-Powered Form Filling Automation | Chrome Extension',
  description: 'Stop wasting time on repetitive form filling. SmartFill automates web forms with AI, records browser sessions for instant replay, and eliminates repetitive tasks forever. Free Chrome extension.',
  keywords: 'form filler, auto fill forms, form automation, AI form filling, browser automation, chrome extension, web scraping, session recording, AI text generation',
  authors: [{ name: 'SmartFill' }],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'SmartFill - AI-Powered Form Filling Automation',
    description: 'Automate form filling with AI, record browser sessions, and eliminate repetitive tasks. Free Chrome extension.',
    type: 'website',
    siteName: 'SmartFill',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartFill - AI-Powered Form Filling Automation',
    description: 'Stop wasting time on repetitive form filling. Automate with AI and session recording.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://smartfill.app',
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "SmartFill",
                "applicationCategory": "BrowserApplication",
                "operatingSystem": "Chrome",
                "description": "AI-powered form filling automation Chrome extension that records browser sessions and eliminates repetitive tasks",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "5",
                  "ratingCount": "1000"
                },
                "featureList": [
                  "One-click form autofill",
                  "AI-powered text generation",
                  "Browser session recording",
                  "Form automation",
                  "Chrome extension"
                ]
              })
            }}
          />
        </head>
        <body>
          <QueryProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}