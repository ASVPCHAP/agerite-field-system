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

**When you find one worth working:** click **Promote to pipeline**. This
does two things at once — it moves them from "research" into your actual
working list, and it claims them as yours (same rule as everywhere else
in this portal: first rep to touch it owns it). Don't promote something
you're not actually about to work — that's what the gold "Prospecting"
state is for, browsing without committing.

## Pipeline: what you're actively working

This is your working list — everything you've promoted or claimed, with
its stage, next step, and who owns it. Use **Log contact** every time you
touch an account; that's what keeps stage and "last touched" accurate for
everyone, including you next week.

If you try to log a contact on something someone else already owns,
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

This is a look-not-touch screen — nothing here is clickable or editable.

## A word on "reset demo data"

If you're testing, not actually working the territory, there's a **reset
demo data** button at the bottom of every portal screen. It puts
everything — leads, pipeline, cert progress — back to its starting state.
Don't click it once this is running for real; it wipes actual work, not
just your own test data.
