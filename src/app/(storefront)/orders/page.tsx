import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

async function getOrderHistory(customerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, short_id, status, total_amount, created_at, order_type')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

/**
 * Customer order history page. Requires authenticated session.
 */
export default async function OrdersPage() {
  const user = await requireAuth()
  const orders = await getOrderHistory(user.id)

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xl font-semibold mb-2">No orders yet</p>
          <p className="text-sm">Your order history will appear here.</p>
          <a
            href="/menu"
            className="mt-6 inline-block bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Menu
          </a>
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {orders.map((order) => (
            <li
              key={order.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-bold text-foreground">{order.short_id}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {order.status.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">
                  ₹{(order.total_amount / 100).toFixed(0)}
                </p>
                <a
                  href={`/track/${order.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View details
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
