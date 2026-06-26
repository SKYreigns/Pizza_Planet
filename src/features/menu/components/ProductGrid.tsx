import { ProductCard } from './ProductCard'
import type { Product } from '@/types/menu'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground">
          We couldn&apos;t find any items matching your criteria.
        </p>
      </div>
    )
  }

  return (
    <div 
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Products"
    >
      {products.map((product) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
