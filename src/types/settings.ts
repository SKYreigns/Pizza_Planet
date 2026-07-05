export interface DayOpeningHours {
  open: string
  close: string
  closed: boolean
}

export type OpeningHoursMap = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DayOpeningHours
>

export interface StoreSettings {
  id: number
  store_name: string
  tagline: string
  logo_url: string | null
  is_open: boolean
  opening_hours: OpeningHoursMap
  delivery_radius_km: number
  delivery_fee: number
  free_delivery_threshold: number
  tax_rate_percent: number
  cod_max_order_amount: number
  currency: string
  currency_symbol: string
  support_phone: string
  whatsapp_number: string
  support_email: string
  updated_by?: string | null
  updated_at?: string
}

export interface StoreSettingsResponse {
  success: boolean
  data?: StoreSettings
  error?: string
}
