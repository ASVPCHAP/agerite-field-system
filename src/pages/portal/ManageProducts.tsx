import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { Product, ProductCategory, ProductStatus } from '../../data/schema'
import { listRepProducts, upsertProduct } from '../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

const CATEGORIES: ProductCategory[] = ['peptide', 'weight-loss', 'hormone', 'topical', 'troche']
const STATUSES: ProductStatus[] = ['current', 'pending_review', 'archived']

interface FormState {
  id: string | null
  name: string
  category: ProductCategory
  concentration: string
  price_5ml: string
  price_10ml: string
  protocol_duration: string
  status: ProductStatus
  rep_note: string
}

const BLANK_FORM: FormState = {
  id: null,
  name: '',
  category: 'peptide',
  concentration: '',
  price_5ml: '',
  price_10ml: '',
  protocol_duration: '',
  status: 'current',
  rep_note: '',
}

function toFormState(p: Product): FormState {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    concentration: p.concentration,
    price_5ml: p.price_5ml == null ? '' : String(p.price_5ml),
    price_10ml: p.price_10ml == null ? '' : String(p.price_10ml),
    protocol_duration: p.protocol_duration,
    status: p.status,
    rep_note: p.rep_note ?? '',
  }
}

const inputClass =
  'mt-1 block w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm text-[var(--surface-ink)]'
const labelClass = 'block font-mono text-xs text-[var(--surface-ink-soft)]'

export function ManageProducts() {
  const { currentRep } = useAuth()
  const [searchParams] = useSearchParams()
  const reviewOnly = searchParams.get('review') === '1'
  const [products, setProducts] = useState<Product[] | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function refresh() {
    listRepProducts().then(setProducts)
  }

  useEffect(refresh, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form || !currentRep) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await upsertProduct(
        {
          id: form.id,
          name: form.name.trim(),
          category: form.category,
          concentration: form.concentration.trim(),
          price_5ml: form.price_5ml.trim() === '' ? null : Number(form.price_5ml),
          price_10ml: form.price_10ml.trim() === '' ? null : Number(form.price_10ml),
          protocol_duration: form.protocol_duration.trim(),
          status: form.status,
          rep_note: form.rep_note.trim() === '' ? null : form.rep_note.trim(),
        },
        `${currentRep.name} (portal edit)`,
      )
      setMessage(`Saved ${saved.name}.`)
      setForm(null)
      refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeading>Manage products</SectionHeading>
        {!form && (
          <button
            type="button"
            onClick={() => setForm(BLANK_FORM)}
            className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white"
          >
            Add product
          </button>
        )}
      </div>
      <div className="mt-2">
        <Note>
          Edits here write straight to the source of truth — same effect as an edit in the Google
          Sheet, same change-log trail.
        </Note>
      </div>

      {message && <p className="mt-3 font-mono text-sm text-[var(--surface-teal)]">{message}</p>}

      {reviewOnly && !form && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Note>Showing products awaiting PIC review (pending_review).</Note>
          <Link
            to="/portal/manage-products"
            className="font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase hover:text-[var(--surface-ink)]"
          >
            Show all
          </Link>
        </div>
      )}

      {form ? (
        <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
          <div>
            <label className={labelClass} htmlFor="pf-name">
              Name
            </label>
            <input
              id="pf-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="pf-category">
                Category
              </label>
              <select
                id="pf-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-status">
                Status
              </label>
              <select
                id="pf-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-concentration">
              Concentration
            </label>
            <input
              id="pf-concentration"
              required
              placeholder="e.g. 5 mg/mL"
              value={form.concentration}
              onChange={(e) => setForm({ ...form, concentration: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="pf-price5">
                Price 5mL
              </label>
              <input
                id="pf-price5"
                type="number"
                min="0"
                step="0.01"
                placeholder="leave blank if n/a"
                value={form.price_5ml}
                onChange={(e) => setForm({ ...form, price_5ml: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-price10">
                Price 10mL
              </label>
              <input
                id="pf-price10"
                type="number"
                min="0"
                step="0.01"
                placeholder="leave blank if n/a"
                value={form.price_10ml}
                onChange={(e) => setForm({ ...form, price_10ml: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-protocol">
              Protocol duration
            </label>
            <input
              id="pf-protocol"
              required
              placeholder="e.g. 4-8 weeks"
              value={form.protocol_duration}
              onChange={(e) => setForm({ ...form, protocol_duration: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-note">
              Rep note (internal only — never shown on the public site)
            </label>
            <textarea
              id="pf-note"
              rows={3}
              value={form.rep_note}
              onChange={(e) => setForm({ ...form, rep_note: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[var(--surface-teal)] px-5 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create product'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-[var(--surface-line)] px-5 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <TableWrap>
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={th}>Concentration</th>
                <th className={th}>5mL</th>
                <th className={th}>10mL</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(products ?? [])
                .filter((p) => !reviewOnly || p.status === 'pending_review')
                .map((p) => (
                  <tr key={p.id}>
                    <td className={td}>{p.name}</td>
                    <td className={td}>{p.category}</td>
                    <td className={tdMono}>{p.concentration}</td>
                    <td className={tdMono}>{p.price_5ml == null ? '—' : `$${p.price_5ml}`}</td>
                    <td className={tdMono}>{p.price_10ml == null ? '—' : `$${p.price_10ml}`}</td>
                    <td className={td}>
                      <Pill tone={p.status === 'current' ? 'current' : p.status === 'archived' ? 'open' : 'review'}>
                        {p.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => setForm(toFormState(p))}
                        className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  )
}
