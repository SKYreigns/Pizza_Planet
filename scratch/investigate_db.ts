import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    process.env[match[1].trim()] = match[2].trim()
  }
}

async function checkTables() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(url!, key!)

  const tables = ['profiles', 'menu_items', 'orders', 'kitchen_staff']
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1)
    console.log(`Table '${table}':`, error ? `ERROR (${error.message})` : `EXISTS (${data?.length} rows)`)
  }

  console.log('--- Checking rpc verify_kitchen_pin ---')
  const { data: rpcData, error: rpcError } = await supabase.rpc('verify_kitchen_pin', { p_pin: '8842' })
  console.log('RPC verify_kitchen_pin:', rpcData, 'Error:', rpcError)
}

checkTables()
