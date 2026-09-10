# Setting up Resend for magic-link email

Supabase's default email sending (used for the portal's magic-link sign-in)
is shared across every free-tier Supabase project and has proven unreliable
in testing — emails arriving with empty bodies, and a low volume cap before
hitting rate limits. This replaces it with Resend as a real SMTP provider.

**Scope of this doc**: domain verification and getting an API key — the
parts that need your DNS access and a Resend account, nothing else. Wiring
the resulting API key into Supabase's SMTP settings happens separately, in
Claude Code, once the key exists — that part is not in this doc on purpose;
see "What this doesn't do" at the bottom.

Domain: **verolyn.org**

## 1. Sign up

Create a free account at [resend.com](https://resend.com). No card needed
for the free tier (3,000 emails/month, 100/day — far more than a handful of
reps will ever generate).

## 2. Add and verify the domain

Dashboard → Domains → Add Domain → `verolyn.org`. Resend will show you a
set of DNS records to add — typically a DKIM record (a TXT at a distinct
subdomain, something like `resend._domainkey.verolyn.org`) and an SPF
requirement.

## 3. Add the DKIM record as-is

This is a brand-new record at a subdomain nothing else uses — copy it into
your DNS exactly as Resend shows it. No conflict possible.

## 4. Merge the SPF record — do not add a second one

This is the one step that needs care. `verolyn.org` **already has** an SPF
record, for Cloudflare Email Routing (confirmed via DNS lookup before
writing this):

```
v=spf1 include:_spf.mx.cloudflare.net ~all
```

A domain can only have **one** valid SPF record — if Resend's requirement
gets added as a second, separate `v=spf1` line instead of being merged into
this one, SPF breaks entirely for the domain (not just for Resend), which
would hurt deliverability for whatever's currently routing through Cloudflare
Email Routing here.

**Correct result** — one line, both includes present:

```
v=spf1 include:_spf.mx.cloudflare.net include:<whatever Resend's dashboard shows for verolyn.org> ~all
```

Edit the *existing* TXT record to this combined value. Don't create a new
TXT record for SPF.

## 5. Any other records Resend asks for

If Resend's setup screen shows anything beyond DKIM and SPF (e.g. a
DMARC record at `_dmarc.verolyn.org`, or a tracking/Return-Path CNAME),
those are new, distinctly-named records — safe to add as shown. If you're
unsure whether something Resend shows is asking to touch an existing
record rather than create a new one, stop and check rather than guessing —
the SPF case above is the only one confirmed to already exist on this
domain, but it's worth a second look at whatever's actually on screen.

## 6. Wait for verification

Resend's Domains page shows a status (pending → verified). DNS propagation
can take anywhere from a few minutes to a few hours. Don't generate the API
key or move on until it shows verified.

## 7. Generate an API key

Dashboard → API Keys → Create API Key. Scope it to sending only if that
option is offered (no need for broader permissions).

## 8. Handing the key back — do not paste it into any chat

Same rule as every other credential in this project: an API key in a chat
transcript (with Claude, with grokbot, with anyone) should be treated as
compromised the moment it's typed there.

Save it to a local file instead, then let Anthony know it's ready so it can
be read directly into Supabase's config without ever being typed into a
conversation:

```
echo "re_your_real_key_here" > resend-api-key.txt
```

Anywhere on disk is fine — just say where.

## What this doesn't do

- **Doesn't touch Supabase.** Configuring the SMTP host/port/user/pass in
  Supabase's Auth settings (`smtp.resend.com`, port 587, user `resend`,
  the API key as the password) happens in the `agerite-field-system`
  project directly, via Claude Code, reading the key from the file above —
  not part of this handoff.
- **Doesn't touch verolyn.org's website hosting or existing inbound email
  routing.** Only DNS TXT records for outbound-email authentication are
  added or edited (DKIM, and the SPF merge above) — no A/AAAA/CNAME/MX
  changes.
- **Doesn't pick a "from" address.** That's a small decision (e.g.
  `sign-in@verolyn.org`) made when wiring up the Supabase side, not
  something to decide here.
