import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import OtpForm from './OtpForm'

export const metadata: Metadata = {
  title: 'Verify OTP',
  description: 'Enter the 6-digit verification code sent to your phone.',
}

interface OtpPageProps {
  searchParams: Promise<{ phone?: string; next?: string }>
}

export default async function OtpPage({ searchParams }: OtpPageProps) {
  const params = await searchParams
  const result = await getCurrentUser()

  if (result.success) {
    redirect(params.next ?? '/profile')
  }

  if (!params.phone) {
    redirect('/auth/signup')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Verify Your Number
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <strong className="text-foreground">{params.phone}</strong>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <OtpForm phone={params.phone} next={params.next} />
        </div>
      </div>
    </main>
  )
}
