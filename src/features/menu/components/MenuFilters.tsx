'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import type { Category } from '@/types/menu'

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

  // Sync state with URL search param changes (for back/forward button or resets)
  useEffect(() => {
    setSearchValue(currentQuery)
  }, [currentQuery])

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <input
          type="search"
          placeholder="Search menu..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full rounded-full border border-input bg-card px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Category Chips */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={currentCategory === 'all'}
          onClick={() => handleFilterChange('all', searchValue)}
          className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            currentCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            role="tab"
            aria-selected={currentCategory === category.id}
            onClick={() => handleFilterChange(category.id, searchValue)}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              currentCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
