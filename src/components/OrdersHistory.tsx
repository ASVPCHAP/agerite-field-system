import { useEffect, useState } from 'react'
import type { Order, Product } from '../data/schema'
import { listOrders } from '../data/store'
import { money, orderValue } from '../data/orders'
import { Note, Pill } from './ui'

const STATUS_TONE: Record<Order['status'], 'current' | 'review' | 'open'> = {
  submitted: 'open',
  processing: 'review',
  shipped: 'review',
  delivered: 'current',
}

const STATUS_LABEL: Record<Order['status'], string> = {
  submitted: 'Submitted',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

/** Preview order history for one clinic — see the Order type in
 *  schema.ts. Same pattern as ActivityHistory, but for order line items
 *  rather than logged interactions. */
export function OrdersHistory({
  clinicId,
  productById,
}: {
  clinicId: string
  productById: Map<string, Product>
}) {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    listOrders(clinicId).then(setOrders)
  }, [clinicId])

  if (orders === null) return null
  if (orders.length === 0) return <Note>No orders yet.</Note>

  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {orders.map((o) => {
        const product = productById.get(o.product_id)
        const value = orderValue(o, productById)
        return (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-line)] pb-1.5"
          >
            <span>
              <span className="font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
                {o.ordered_at}
              </span>{' '}
              {product?.name ?? o.product_id} · {o.quantity} × {o.size}
            </span>
            <span className="flex items-center gap-2">
              {value != null && <span className="font-mono text-xs">{money(value)}</span>}
              <Pill tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Pill>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
