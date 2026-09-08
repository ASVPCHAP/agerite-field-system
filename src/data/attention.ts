// Shared "needs attention" rules for the portal Dashboard (and any
// deep-link filters that land on Pipeline). Kept out of the stores so
// mock and Supabase stay in lockstep — both already expose last_touch_at
// on Clinic via listClinics().

import type { Clinic } from './schema'

/** Clinics with no logged contact in this many days appear on the
 *  Dashboard needs-attention strip. Change this one constant to retune. */
export const NO_CONTACT_DAYS = 14

const MS_PER_DAY = 86_400_000

export function daysSinceTouch(lastTouchAt: string | null, today: Date): number | null {
  if (!lastTouchAt) return null
  const then = new Date(`${lastTouchAt}T00:00:00`)
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  return Math.round((todayStart.getTime() - then.getTime()) / MS_PER_DAY)
}

/** True when the clinic has never been touched, or last touch is at least
 *  `windowDays` ago. */
export function clinicNeedsContact(
  clinic: Clinic,
  today: Date,
  windowDays: number = NO_CONTACT_DAYS,
): boolean {
  const days = daysSinceTouch(clinic.last_touch_at, today)
  if (days == null) return true
  return days >= windowDays
}

/** Clinics the current rep can actually work: owned by them, or still open. */
export function isActionableClinic(clinic: Clinic, repId: string | undefined): boolean {
  return !clinic.owner_rep_id || clinic.owner_rep_id === repId
}
