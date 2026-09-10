// 1099 Sales Representative Commission Plan — GLP-1 & Wellness Program
// Outreach, effective 2026-07-14 (Chapman - AGErite_1099_Commission_Plan
// REVISED 0726.pdf). Graduated/marginal brackets against monthly Gross
// Sales, same shape as a tax bracket — only the portion of sales inside
// each bracket is paid at that bracket's rate. Tiers reset each calendar
// month and are not cumulative across months.

export interface CommissionBracket {
  label: string
  min: number
  max: number | null // null = no upper bound
  rate: number // e.g. 0.06 = 6%
}

export const COMMISSION_BRACKETS: CommissionBracket[] = [
  { label: '$0 – $5,000', min: 0, max: 5000, rate: 0.06 },
  { label: '$5,000.01 – $15,000', min: 5000, max: 15000, rate: 0.08 },
  { label: '$15,000.01 – $30,000', min: 15000, max: 30000, rate: 0.1 },
  { label: '$30,000.01+', min: 30000, max: null, rate: 0.12 },
]

export interface CommissionBreakdownRow {
  label: string
  rate: number
  amountInBracket: number
  commission: number
}

export function calculateCommission(grossSales: number): { rows: CommissionBreakdownRow[]; total: number } {
  const sales = Math.max(0, grossSales)
  const rows: CommissionBreakdownRow[] = []
  let total = 0
  for (const b of COMMISSION_BRACKETS) {
    const amountInBracket = Math.max(0, Math.min(sales, b.max ?? Infinity) - b.min)
    if (amountInBracket <= 0) continue
    const commission = amountInBracket * b.rate
    rows.push({ label: b.label, rate: b.rate, amountInBracket, commission })
    total += commission
  }
  return { rows, total }
}
