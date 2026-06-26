declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string

    // Razorpay (used in Server Actions / Route Handlers only)
    RAZORPAY_KEY_ID: string
    RAZORPAY_KEY_SECRET: string
    RAZORPAY_WEBHOOK_SECRET: string

    // WhatsApp Cloud API (used in Edge Functions)
    WHATSAPP_API_TOKEN: string
    WHATSAPP_PHONE_NUMBER_ID: string

    // Site
    NEXT_PUBLIC_SITE_URL: string

    NODE_ENV: 'development' | 'production' | 'test'
  }
}
