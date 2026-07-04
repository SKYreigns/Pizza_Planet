'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, User, Menu, X, Sparkles, LogIn } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { getItemCount, toggleCart } = useCartStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const itemCount = mounted ? getItemCount() : 0

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Menu', href: '/menu' },
    { name: 'Orders', href: '/orders' },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        isScrolled
          ? 'bg-[#F9F6F2]/85 dark:bg-[#121214]/85 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 font-heading font-extrabold text-2xl tracking-tight text-foreground group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
            aria-label="Pizza Planet Home"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#C93A2F] text-white shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Sparkles className="h-5 w-5 fill-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                PIZZA PLANET
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-primary mt-1 font-body">
                Artisanal Pie Studio
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-white/60 dark:bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions: Account & Cart */}
          <div className="flex items-center gap-3">
            {/* User Profile / Login */}
            {user ? (
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2 h-11 px-4 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-white dark:hover:bg-black transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title={user.full_name || user.email || 'Profile'}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {(user.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.full_name || 'Account'}</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="hidden sm:flex items-center gap-2 h-11 px-5 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-white dark:hover:bg-black transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogIn className="h-4 w-4 text-primary" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Cart Button */}
            <button
              onClick={toggleCart}
              className={cn(
                'relative flex items-center gap-2.5 h-11 px-5 rounded-full font-semibold text-sm transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                itemCount > 0
                  ? 'bg-gradient-to-r from-primary to-[#C93A2F] text-white shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-foreground hover:border-primary/40 shadow-sm'
              )}
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <ShoppingBag className={cn('h-4 w-4', itemCount > 0 ? 'text-white' : 'text-primary')} />
              <span>Cart</span>
              <AnimatePresence mode="popLayout">
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white text-primary font-extrabold text-xs px-1.5 shadow-inner"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-black/10 dark:border-white/10 bg-[#F9F6F2]/95 dark:bg-[#121214]/95 backdrop-blur-2xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 space-y-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-2xl text-base font-semibold transition-colors',
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white/50 dark:bg-black/50 text-foreground hover:bg-white dark:hover:bg-black'
                    )}
                  >
                    <span>{link.name}</span>
                  </Link>
                )
              })}
              
              <div className="pt-3 border-t border-black/5 dark:border-white/5">
                {user ? (
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 dark:bg-black/60 text-foreground font-semibold"
                  >
                    <User className="h-5 w-5 text-primary" />
                    <span>Account Profile ({user.full_name || 'Logged in'})</span>
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 text-primary font-bold"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Sign In / Register</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
