'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { Search, X, Sparkles, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Category } from '@/types/menu'
import { cn } from '@/lib/utils'

export function MenuFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const currentCategory = searchParams.get('category') || 'all'
  const currentQuery = searchParams.get('q') || ''
  
  const [searchValue, setSearchValue] = useState(currentQuery)

  const handleFilterChange = (categoryId: string, query: string) => {
    const params = new URLSearchParams()
    if (categoryId !== 'all') params.set('category', categoryId)
    if (query) params.set('q', query)
    
    startTransition(() => {
      router.push(`/menu?${params.toString()}`)
    })
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== currentQuery) {
        handleFilterChange(currentCategory, searchValue)
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  // Sync state with URL search param changes
  useEffect(() => {
    setSearchValue(currentQuery)
  }, [currentQuery])

  const handleClearSearch = () => {
    setSearchValue('')
    handleFilterChange(currentCategory, '')
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white/60 dark:bg-[#1C1C1F]/60 backdrop-blur-xl p-4 rounded-[26px] border border-black/5 dark:border-white/10 shadow-sm">
      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-2 md:pb-0 scrollbar-none gap-2 flex-1" role="tablist">
        <button
          role="tab"
          aria-selected={currentCategory === 'all'}
          onClick={() => handleFilterChange('all', searchValue)}
          className={cn(
            'relative whitespace-nowrap rounded-full px-6 py-3 text-sm font-heading font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            currentCategory === 'all'
              ? 'text-white shadow-md shadow-primary/25'
              : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
          )}
        >
          {currentCategory === 'all' && (
            <motion.div
              layoutId="activeCategoryTab"
              className="absolute inset-0 bg-gradient-to-r from-primary to-[#C93A2F] rounded-full -z-10"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span>All Creations</span>
        </button>

        {categories.map((category) => {
          const isSelected = currentCategory === category.id
          return (
            <button
              key={category.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleFilterChange(category.id, searchValue)}
              className={cn(
                'relative whitespace-nowrap rounded-full px-6 py-3 text-sm font-heading font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'text-white shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryTab"
                  className="absolute inset-0 bg-gradient-to-r from-primary to-[#C93A2F] rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span>{category.name}</span>
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80 shrink-0">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="search"
          placeholder="Search pizzas, ingredients..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-black pl-11 pr-10 py-3 text-sm font-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner transition-all"
        />
        {searchValue && !isPending && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isPending && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
