import { Link } from 'react-router-dom'
import { Note } from '../../components/ui'

export function Home() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-5xl leading-[1.1] font-semibold text-balance">
        The <span className="text-[var(--surface-teal)] italic">source of truth</span> for every
        product you carry.
      </h1>
      <p className="mt-6 max-w-[52ch] text-lg text-[var(--surface-ink-soft)]">
        One reference, one price, one concentration — for every prescriber, every rep, every
        state. If it isn't here, it isn't current.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to="/products"
          className="rounded-full bg-[var(--surface-teal)] px-5 py-2 text-sm text-white"
        >
          View product reference
        </Link>
        <Link
          to="/portal/login"
          className="rounded-full border border-[var(--surface-line)] px-5 py-2 text-sm"
        >
          Rep sign-in
        </Link>
      </div>
      <div className="mt-12">
        <Note>
          AGErite Pharmacy &amp; Wellness Center is a 503A licensed compounding pharmacy in
          Cypress, TX.
        </Note>
      </div>
    </div>
  )
}
