// Standard Supabase Edge Function CORS headers. Browsers (the Vercel
// portal) send a preflight OPTIONS request and then read the POST
// response; without these headers supabase-js surfaces
// FunctionsFetchError ("Failed to send a request to the Edge Function")
// even when the function itself succeeded.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
