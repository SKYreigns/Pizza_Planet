'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { cn } from '@/lib/utils'

interface SignOutButtonProps {
  className?: string
  variant?: 'default' | 'ghost' | 'outline' | 'destructive'
  children?: React.ReactNode
}

export function SignOutButton({
  className,
  variant = 'default',
  children = 'Sign Out',
}: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none rounded-xl text-sm h-10 px-4 py-2 cursor-pointer'
  
  const variantStyles = {
    default: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    ghost: 'hover:bg-black/5 dark:hover:bg-white/5 text-foreground',
    outline: 'border border-black/10 dark:border-white/10 bg-background hover:bg-black/5 dark:hover:bg-white/5 text-foreground',
    destructive: 'bg-[#C93A2F] text-white hover:bg-[#C93A2F]/90 shadow-sm',
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className={cn(baseStyles, variantStyles[variant], className)}
      aria-label="Sign Out"
    >
      <LogOut className="h-4 w-4" />
      <span>{isPending ? 'Signing out...' : children}</span>
    </button>
  )
}
