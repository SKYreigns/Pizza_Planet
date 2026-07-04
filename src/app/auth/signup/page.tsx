import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import SignUpForm from './SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Enter your mobile number to get started with Pizza Planet.',
}

interface SignUpPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const result = await getCurrentUser()

  if (result.success) {
    redirect(params.next ?? '/profile')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pizza Planet
          </h1>
          <p className="text-muted-foreground text-sm">Enter your mobile number to sign in or sign up</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <SignUpForm next={params.next} />
        </div>
      </div>
    </main>
  )
}
