# Setting up the Google Sheet sync

The sync itself is built and deployed (`supabase/functions/sync-products-sheet`).
It's not usable yet because it needs three things only you can provide — none
of them go through Claude, all of them are one-time setup.

## 1. Create the Sheet

Use `AGErite-Products-Sheet-Template.csv` (sent alongside this) as the
starting point — it already matches what's live in the database, so nothing
changes on the first sync. In Google Sheets: File → Import → Upload, choose
"Insert new sheet(s)", then **rename that tab to `Products`** (the sync
looks for a tab with exactly that name — see step 4 if you'd rather use a
different name).

Columns, in order: `Name, Category, Concentration, Price 5mL, Price 10mL,
Protocol Duration, Status, Rep Note`. Row 1 is headers; data starts row 2.

- **Category** must be one of: `peptide`, `weight-loss`, `hormone`,
  `topical`, `troche`.
- **Status** must be one of: `current`, `pending_review`, `archived` (blank
  defaults to `current`).
- **Name** is the match key — the sync matches rows to existing products by
  name, so keep spelling/capitalization consistent (renaming a product in
  the sheet creates a new row rather than updating the old one).
- Reviewed-by/reviewed-at aren't sheet columns — the sync stamps those
  itself ("Cindy R., PIC (Sheet sync)" + today's date) on every change,
  since editing the sheet *is* the review.

Hand this sheet to Cindy — she edits it directly, same as the plan from the
Ron/Melissa meeting.

## 2. Create a Google Cloud service account

The sync reads the sheet server-side (no one has to authorize it
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
   step 1 and share it with that email address (Viewer is enough — the sync
   only reads).

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

Sign into the portal and click **"Sync from Google Sheet"** on the
Dashboard. It reports created/updated/unchanged/skipped counts, and any row
it couldn't parse (with a reason) rather than failing the whole sync.

## What this doesn't do yet

- **No scheduling.** Someone has to click the button. Turning this into a
  recurring sync (e.g. every 15 minutes) is a follow-up — Supabase's
  `pg_cron` + `pg_net` extensions can call this same function on a schedule
  once the secrets above are confirmed working, so there's no reason to set
  that up before verifying a manual sync succeeds first.
- **One-way.** The sheet is the source of truth; this never writes back to
  it.
- **No row deletion handling.** Removing a row from the sheet does not
  archive the matching product — set its Status to `archived` in the sheet
  instead. This is deliberate: silently archiving on a blank/deleted row is
  one accidental sheet edit away from hiding a real product.
