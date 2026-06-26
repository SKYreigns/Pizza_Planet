export interface Category {
  id: string
  slug: string
  name: string
  display_order: number
  is_archived: boolean
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  is_veg: boolean
  is_available: boolean
  is_archived: boolean
  display_order: number
}

export interface ProductVariant {
  id: string
  product_id: string
  size_name: string
  size_label: string
  price_adjustment: number
  display_order?: number
}

export type OptionType = 'crust' | 'sauce' | 'topping' | 'size'

export interface CustomizationOption {
  id: string
  type: OptionType
  name: string
  price: number
  is_veg: boolean
  is_available: boolean
}

export interface ProductCustomization {
  product_id: string
  option_id: string
  is_default: boolean
  customization_option?: CustomizationOption
}

export interface ProductWithDetails extends Product {
  variants?: ProductVariant[]
  customizations?: ProductCustomization[]
}
