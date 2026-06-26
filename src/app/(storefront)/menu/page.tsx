import { Suspense } from 'react'
import { getCategories, getProducts } from '@/features/menu/queries'
import { ProductGrid } from '@/features/menu/components/ProductGrid'
import { MenuFilters } from '@/features/menu/components/MenuFilters'
import { ProductModal } from '@/features/product-modal'

export const dynamic = 'force-dynamic'

interface MenuPageProps {
  searchParams: Promise<{
    category?: string
    q?: string
  }>
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  // Await searchParams in Next.js 15
  const params = await searchParams
  const categoryId = params.category === 'all' ? undefined : params.category
  const query = params.q?.toLowerCase()

  const [categories, allProducts] = await Promise.all([
    getCategories(),
    getProducts(categoryId),
  ])

  // Filter products by search query if present
  const products = query
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
    : allProducts

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Our Menu</h1>
        <p className="text-lg text-muted-foreground">
          Hand-crafted pizzas with the freshest ingredients in the galaxy.
        </p>
      </div>

      <Suspense fallback={<div className="h-20 animate-pulse bg-card/40 rounded-3xl border border-white/5 mb-8" />}>
        <MenuFilters categories={categories} />
      </Suspense>

      <Suspense fallback={<MenuGridSkeleton />}>
        <ProductGrid products={products} />
      </Suspense>
      
      {/* Product Customization Modal */}
      <ProductModal />
    </div>
  )
}

function MenuGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 shadow-glass animate-pulse">
          <div className="aspect-[4/3] w-full bg-muted" />
          <div className="flex flex-1 flex-col p-4">
            <div className="h-6 w-3/4 bg-muted rounded mb-2" />
            <div className="h-4 w-full bg-muted rounded mb-1" />
            <div className="h-4 w-2/3 bg-muted rounded mb-4" />
            <div className="flex items-center justify-between mt-auto">
              <div className="h-6 w-16 bg-muted rounded" />
              <div className="h-10 w-10 bg-muted rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
