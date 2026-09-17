import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import { DemoDataBanner } from '@/components/demo-data-banner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Career Journey Tracker',
  description:
    'Career readiness tracking for York College CS and AI Certificate students',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DemoDataBanner />

        <header className="border-b">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
            <div className="flex items-center gap-8">
              <Link href="/" className="font-semibold">
                Career Journey Tracker
              </Link>
              {/* Only routes that exist. Milestones and Reports were here as
                  placeholders; milestones live on the student profile, and
                  reporting is Phase 2. A nav link to a 404 costs an advisor
                  more trust than a missing feature does. */}
              <div className="text-muted-foreground flex gap-6">
                <Link href="/" className="hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/students" className="hover:text-foreground">
                  Students
                </Link>
                <Link
                  href="/admin/career-map"
                  className="hover:text-foreground"
                >
                  Career map admin
                </Link>
              </div>
            </div>
            {/* Authentication is Phase 2. Until then this is a fixed label, not
                a signed-in user — it must not start looking like one. */}
            <span className="text-muted-foreground text-sm">
              Signed in as: Advisor (no authentication yet)
            </span>
          </nav>
        </header>

        {children}
      </body>
    </html>
  )
}
