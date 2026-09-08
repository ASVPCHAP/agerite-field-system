# Setting up the Google Sheet import

The sync itself is built and deployed (`supabase/functions/sync-products-sheet`).
It's not usable yet because it needs three things only you can provide — none
of them go through Claude, all of them are one-time setup.

**Note the framing change**: this is now an *import*, not a live sync. The
**portal's "Manage Products" form is the authoritative way to edit a
product** — this Sheet import only creates products that aren't in the
database yet. It never touches an existing product, so it can't overwrite
an edit made in the portal. See "What this doesn't do" below for exactly
what that means in practice.

## 1. Create the Sheet

Use `AGErite-Products-Sheet-Template.csv` (sent alongside this) as the
starting point — it already matches what's live in the database, so
importing it fresh creates nothing (every row already exists). In Google
Sheets: File → Import → Upload, choose "Insert new sheet(s)", then
**rename that tab to `Products`** (the import looks for a tab with exactly
that name — see step 4 if you'd rather use a different name).

Columns, in order: `Name, Category, Concentration, Price 5mL, Price 10mL,
Protocol Duration, Status, Rep Note`. Row 1 is headers; data starts row 2.

- **Category** must be one of: `peptide`, `weight-loss`, `hormone`,
  `topical`, `troche`.
- **Status** must be one of: `current`, `pending_review`, `archived` (blank
  defaults to `current`).
- **Name** is the match key — a row whose name already exists as a product
  is left alone, not applied. Add new products here; edit existing ones in
  the portal.

Use this for bulk-adding products that don't exist yet — e.g. handing
Cindy a batch of new peptides to add at once — rather than as her everyday
editing surface. For one-off edits or adding a single product, the portal
form is simpler and takes effect immediately.

## 2. Create a Google Cloud service account

The import reads the sheet server-side (no one has to authorize it
interactively), which needs a service account:

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create
   a project (or reuse one).
2. APIs & Services → Library → enable **Google Sheets API**.
3. APIs & Services → Credentials → Create Credentials → Service Account.
   Name it anything (e.g. "agerite-sheet-sync"). No IAM role needed — access
   comes from sharing the sheet with it, not from a project role.
4. Open the new service account → Keys → Add Key → Create new key → JSON.
   This downloads a JSON file — treat it like a password.
5. In that JSON, copy the `client_email` value, then open the Sheet from
   step 1 and share it with that email address (Viewer is enough — the
   import only reads).

## 3. Add the secrets to Supabase

In the Supabase dashboard for this project → Edge Functions → Secrets (or
via the CLI: `supabase secrets set KEY=value`), add:

| Secret | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON key |
| `GOOGLE_PRIVATE_KEY` | the `private_key` from the JSON key, pasted exactly as it appears (including the `\n` sequences and `-----BEGIN/END PRIVATE KEY-----` lines) |
| `GOOGLE_SHEET_ID` | the long ID in the sheet's URL, between `/d/` and `/edit` |

Optional: `GOOGLE_SHEET_RANGE` if your tab isn't named `Products` (defaults
to `Products!A2:H`).

**Do this yourself, directly in the Supabase dashboard or CLI** — don't paste
the JSON key or its contents into a chat with Claude. The edge function code
is already written to read these as environment secrets; it never needs the
raw key handed to it any other way.

## 4. Test it

Sign into the portal and click **"Import new products from Sheet"** on the
Dashboard. It reports how many rows were imported as new products, how many
were skipped because a product with that name already exists, and any row
it couldn't parse (with a reason) rather than failing the whole import.

## What this doesn't do

- **Never edits an existing product.** This is deliberate, not a
  limitation to fix later — it's what makes the portal form safe to treat
  as authoritative. A Sheet row for a product that already exists is
  reported back as "already exists," not applied. Re-running the import
  after editing a product in the portal is always a safe no-op for that
  product.
- **No scheduling.** Someone has to click the button. Given it's import-only
  now, scheduling matters less than it would for a live sync — there's
  nothing to keep continuously fresh, just new products to pick up when
  they're added to the Sheet. Still possible later via `pg_cron` + `pg_net`
  if it turns out to be useful.
- **No row deletion handling.** Removing a row from the sheet does nothing
  — it was only ever read once, at import.
