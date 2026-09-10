// Shared order-value math for the SiCompounding preview data (see the
// Order type in schema.ts and CRM_SPEC.md section 9). Kept out of the
// stores so Dashboard's summary column and OrdersHistory's line items
// price orders the same way.

import type { Order, Product } from './schema'

export function orderUnitPrice(order: Order, productById: Map<string, Product>): number | null {
  const product = productById.get(order.product_id)
  if (!product) return null
  return order.size === '10ml' ? product.price_10ml : product.price_5ml
}

export function orderValue(order: Order, productById: Map<string, Product>): number | null {
  const unitPrice = orderUnitPrice(order, productById)
  return unitPrice == null ? null : unitPrice * order.quantity
}

export function orderTotals(
  orders: Order[],
  productById: Map<string, Product>,
): { count: number; value: number } {
  let value = 0
  for (const o of orders) {
    value += orderValue(o, productById) ?? 0
  }
  return { count: orders.length, value }
}

export function money(n: number): string {
  return `$${n.toLocaleString()}`
}
