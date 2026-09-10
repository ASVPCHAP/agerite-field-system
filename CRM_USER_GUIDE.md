# Using the CRM

This is a walkthrough for reps — what each screen is for and when to use
it. It'll grow as the rest of the portal gets documented; for now it
covers the CRM section (Leads, Pipeline, Analytics).

## Getting there

Sign in at the portal login, then click **CRM** in the sidebar. You'll
land on **Leads** — that's the default screen.

## Leads: who's out there

This screen shows everyone — clinics you haven't touched yet, ones you're
actively working, and ones already ordering — in one list. Each row has a
colored bar on the left telling you which:

- **Gold = Prospecting.** Nobody's talked to them yet. This is your
  hit list.
- **Teal = In pipeline.** Someone's working this one already — check the
  Owned column to see who.
- **Vermilion (red-orange) = Active account.** They're already ordering.
  Nothing to chase here — this is who you check in with, not who you pitch.

Use the filters at the top (cluster, tier, state) to narrow down to, say,
"Tier 1 prospects in Rockwall core" before a field day.

**Calling or texting a prospect?** Use **Log activity** right on this
screen — pick Call or Text, add a note, save. It doesn't move them to
Pipeline or claim them; it's just a record that you reached out.

**Visited in person and actually talked to them?** Also **Log
activity**, but pick **In-person visit**. That one's different — it *is*
the moment a real relationship starts, so it does what **Promote to
pipeline** does: moves them into your working list and claims them as
yours (same rule as everywhere else in this portal: first rep to touch
it owns it). You can also just click **Promote to pipeline** directly if
you'd rather skip logging a specific visit.

Either way, don't log a visit (or promote) on something you're not
actually about to work — that's what the gold "Prospecting" state is
for, calling and texting around without committing yet.

**History** on any row shows everything logged against it so far — who,
when, what kind, and any notes.

## Pipeline: what you're actively working

This is your working list — everything you've promoted or claimed, with
its stage, next step, and who owns it. Use **Log activity** every time
you touch an account — call, text, visit, email, or just a note — and
pick the type and add a note. That's what keeps the history (and
"last touched") accurate for everyone, including you next week. Click
**History** on a row to see everything logged so far.

If you try to log an activity on something someone else already owns,
you'll be told who and since when — that's not a bug, that's the point.
Ask an admin if you think it's wrong.

## Find prospects: research new leads with your own AI

This is how you find businesses that aren't in the system yet — using an
AI tool you already have (a free ChatGPT, Claude, or Perplexity account
works fine), not something AGErite pays for.

1. Pick a category and an area, then click **Generate prompt**.
2. Copy it and paste it into your AI tool. It already knows to skip
   anything we've already got in that area, so you won't get duplicates.
3. Copy whatever it gives you back, paste it into the **Paste your AI's
   results** box here, and click **Parse results**.
4. You'll get an editable table — nothing's saved yet. Set a tier for
   each one (your AI doesn't know AGErite's fit criteria — that's your
   call), fix anything that looks wrong, and remove anything bad.
5. Click **Import** and they show up on the Leads tab as new prospects,
   gold bar, ready to work.

If your AI's results don't parse into the table, it probably didn't
follow the exact `Name | City | Phone | Email | Website` format the
prompt asks for — ask it to reformat and paste again.

## Analytics: the whole picture

Three numbers up top — Prospecting, In pipeline, Active — sized to show
the shape of the funnel at a glance. Below that, the same counts broken
down by tier and by cluster, so you (or Cindy, or Anthony) can see where
the territory actually stands without opening three different screens.

Most of this screen is look-not-touch — nothing in the tables is
clickable or editable.

**If you're leadership** (Cindy, Anthony, Melissa, or Ron), there's one
more thing at the bottom: a box to ask a free-text question — "which reps
have stale accounts," "how's the pipeline looking this month," that kind
of thing. It only knows what's in the CRM (reps, leads, pipeline,
refills, products) — it can't look anything up outside that, and it
doesn't remember earlier questions, so ask each one as a complete
question. This box doesn't show up for reps without leadership access.

## A word on "reset demo data"

If you're testing, not actually working the territory, there's a **reset
demo data** button at the bottom of every portal screen. It puts
everything — leads, pipeline, cert progress — back to its starting state.
Don't click it once this is running for real; it wipes actual work, not
just your own test data.
