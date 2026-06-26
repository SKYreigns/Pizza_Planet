import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import type { SessionUser } from '@/types/auth'
import { Toaster } from 'sonner'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const manrope = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Pizza Planet — Out of this world pizza',
    template: '%s | Pizza Planet',
  },
  description:
    'Order artisan pizzas online. Customise your pie, track your order live, and get it delivered fast.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pizzaplanet.in',
  ),
  openGraph: {
    type: 'website',
    siteName: 'Pizza Planet',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Resolve the current user on the server so AuthProvider receives
  // authoritative session data on the initial render.
  const authResult = await getCurrentUser()
  const sessionUser: SessionUser | null = authResult.success
    ? {
        id: authResult.data.id,
        email: authResult.data.email,
        role: authResult.data.role,
        full_name: authResult.data.profile.full_name,
        avatar_url: authResult.data.profile.avatar_url,
      }
    : null

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${manrope.variable} font-body antialiased bg-background text-foreground`}
      >
        <AuthProvider initialUser={sessionUser}>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
