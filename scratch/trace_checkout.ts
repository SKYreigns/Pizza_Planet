import { createOrder } from '../src/actions/orders/createOrder'
import { createClient } from '@supabase/supabase-js'

async function runTrace() {
  console.log('==================================================')
  console.log('STARTING END-TO-END CHECKPOINT TRACE')
  console.log('==================================================')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(url, key)

  // 1. Fetch real seeded data
  console.log('1. Fetching sample product from database...')
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('*')
    .eq('is_archived', false)
    .limit(1)

  if (pErr || !products || products.length === 0) {
    console.error('Failed to fetch products:', pErr)
    return
  }
  const p = products[0]
  console.log(`   Selected Product: ${p.name} (${p.id}) - Base Price: ${p.base_price}`)

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', p.id)
    .limit(1)
  const v = variants && variants.length > 0 ? variants[0] : null
  console.log(`   Selected Variant: ${v ? `${v.size_name} (${v.id}) adjustment=${v.price_adjustment}` : 'None'}`)

  const { data: options } = await supabase
    .from('customization_options')
    .select('*')
    .eq('is_available', true)
    .limit(1)
  const opt = options && options.length > 0 ? options[0] : null
  console.log(`   Selected Option: ${opt ? `${opt.name} (${opt.id}) price=${opt.price}` : 'None'}`)

  const clientUnitPrice = p.base_price + (v ? v.price_adjustment : 0) + (opt ? opt.price : 0)
  const quantity = 1
  const serverSubtotal = clientUnitPrice * quantity
  const tax = Math.round(serverSubtotal * 0.05)
  const deliveryFee = 4900
  const totalAmount = serverSubtotal + tax + deliveryFee

  // 2. Build payload exactly as CheckoutForm.tsx does
  const payload = {
    customerName: 'Test Customer',
    customerPhone: '+919876543210',
    customerEmail: 'test@example.com',
    orderType: 'delivery' as const,
    paymentMethod: 'cod' as const,
    deliveryAddress: {
      flat: '101 Galaxy Apts',
      landmark: 'Near Meteor Crater',
      area: 'Satellite Road',
      city: 'Bangalore',
      pincode: '560001',
    },
    specialInstructions: 'Ring the bell twice.',
    items: [
      {
        productId: p.id,
        variantId: v ? v.id : null,
        quantity: quantity,
        clientUnitPrice: clientUnitPrice,
        options: opt
          ? [
              {
                optionId: opt.id,
                priceSnapshot: opt.price,
              },
            ]
          : [],
      },
    ],
    idempotencyKey: '11111111-2222-4333-8444-555555555555',
  }

  console.log('\n2. Invoking createOrder Server Action with quantity=1 payload...')
  try {
    const result = await createOrder(payload)
    console.log('\n3. Result from createOrder:')
    console.log(JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error('\n3. createOrder threw an exception:')
    console.error(err)
  }

  // 3. Test direct RPC invocation with quantity=1 (<= 50000 limit)
  console.log('\n4. Testing direct RPC create_order_transactional invocation (quantity=1)...')
  const rpcPayload = {
    p_order_type: 'delivery',
    p_customer_id: null,
    p_customer_name: 'Test Customer',
    p_customer_phone: '+919876543210',
    p_customer_email: 'test@example.com',
    p_delivery_address: {
      flat: '101 Galaxy Apts',
      landmark: 'Near Meteor Crater',
      area: 'Satellite Road',
      city: 'Bangalore',
      pincode: '560001',
    },
    p_special_instructions: 'Ring the bell twice.',
    p_payment_method: 'cod',
    p_discount_amount: 0,
    p_subtotal: serverSubtotal,
    p_tax: tax,
    p_delivery_fee: deliveryFee,
    p_total_amount: totalAmount,
    p_idempotency_key: '11111111-2222-4333-8444-555555555555',
    p_items: [
      {
        product_id: p.id,
        variant_id: v ? v.id : null,
        product_name_snapshot: p.name,
        quantity: quantity,
        unit_price: clientUnitPrice,
        total_price: clientUnitPrice * quantity,
        options: opt
          ? [
              {
                option_id: opt.id,
                option_name_snapshot: opt.name,
                price_snapshot: opt.price,
              },
            ]
          : [],
      },
    ],
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_order_transactional', rpcPayload)
  if (rpcError) {
    console.error('RPC REJECTED:', JSON.stringify(rpcError, null, 2))
  } else {
    console.log('RPC SUCCESS! Created Order:', JSON.stringify(rpcData, null, 2))
  }
}

runTrace()
