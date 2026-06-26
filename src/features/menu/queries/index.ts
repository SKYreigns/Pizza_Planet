import { createClient } from '@/lib/supabase/server'
import type { Category, Product, ProductWithDetails } from '@/types/menu'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }

  return data ?? []
}

export async function getProducts(categoryId?: string): Promise<Product[]> {
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_archived', false)
    .order('display_order', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch products:', error)
    return []
  }

  return data ?? []
}

export async function getProductById(id: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient()
  
  // We fetch product with its variants and customizations in a single query
  // using Supabase's foreign table syntax
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      variants:product_variants(*),
      customizations:product_customizations(
        *,
        customization_option:customization_options(*)
      )
    `)
    .eq('id', id)
    .eq('is_archived', false)
    .single()

  if (error) {
    console.error(`Failed to fetch product by id ${id}:`, error)
    return null
  }

  // Filter out unavailable customizations just in case
  const product = data as ProductWithDetails
  if (product.customizations) {
    product.customizations = product.customizations.filter(
      (c) => c.customization_option?.is_available
    )
  }

  return product
}
