import type { ReactNode } from 'react'

type PillTone = 'current' | 'review' | 'owned' | 'open' | 'pass' | 'fail'

const pillToneClasses: Record<PillTone, string> = {
  current: 'text-[var(--surface-teal)] border-[var(--surface-teal)]',
  review: 'text-[var(--surface-gold)] border-[var(--surface-gold)]',
  owned: 'text-[var(--surface-vermilion)] border-[var(--surface-vermilion)]',
  open: 'text-[var(--surface-ink-soft)] border-[var(--surface-line)]',
  pass: 'text-[var(--surface-teal)] border-[var(--surface-teal)]',
  fail: 'text-[var(--surface-vermilion)] border-[var(--surface-vermilion)]',
}

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] tracking-wide uppercase ${pillToneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-sm border border-[var(--surface-line)] bg-[var(--surface-bg-2)] p-5 ${className}`}
    >
      {children}
    </div>
  )
}

export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <Card>
      <div className="font-mono text-3xl text-[var(--surface-ink)]">{value}</div>
      <div className="mt-1 font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
        {label}
      </div>
    </Card>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-semibold text-balance text-[var(--surface-ink)]">
      {children}
    </h2>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--surface-ink-soft)] italic">{children}</p>
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>
}

export const th = 'border-b border-[var(--surface-ink)] px-2 py-2 text-left font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase'
export const td = 'border-b border-[var(--surface-line)] px-2 py-3 align-top'
export const tdMono = `${td} font-mono whitespace-nowrap`
