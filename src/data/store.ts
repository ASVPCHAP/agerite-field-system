// Picks the real Supabase-backed store when the app has a project configured
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), and falls back to the
// localStorage mock otherwise — so this repo still runs for anyone who
// clones it without a Supabase project of their own. Every page in the app
// imports from here, never from mockStore/supabaseStore directly.

import { supabaseConfigured } from './supabaseClient'
import * as mockStore from './mockStore'
import * as supabaseStore from './supabaseStore'

export type { AssistantResult, PublicProduct, LogActivityInput, LogActivityResult, MagicLinkResult, NewLeadInput, SheetSyncResult, ProductFormInput } from './storeTypes'

const impl = supabaseConfigured ? supabaseStore : mockStore

export const requestMagicLink = impl.requestMagicLink
export const subscribeAuth = impl.subscribeAuth
export const logout = impl.logout
export const getCurrentRep = impl.getCurrentRep
export const listPublicProducts = impl.listPublicProducts
export const listRepProducts = impl.listRepProducts
export const listPendingReview = impl.listPendingReview
export const listProductChangeLog = impl.listProductChangeLog
export const upsertProduct = impl.upsertProduct
export const listClinics = impl.listClinics
export const listActivities = impl.listActivities
export const logActivity = impl.logActivity
export const listOrders = impl.listOrders
export const listLeads = impl.listLeads
export const createLeads = impl.createLeads
export const promoteLead = impl.promoteLead
export const listReps = impl.listReps
export const listRefills = impl.listRefills
export const listClusters = impl.listClusters
export const listLicensedStates = impl.listLicensedStates
export const listCertificationModules = impl.listCertificationModules
export const submitCertificationAttempt = impl.submitCertificationAttempt
export const resetDemoData = impl.resetDemoData
export const syncProductsFromSheet = impl.syncProductsFromSheet
export const askAssistant = impl.askAssistant
