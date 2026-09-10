# Setting up OpenRouter for the sales-analytics assistant

The assistant itself is built and deployed
(`supabase/functions/crm-assistant`). It's not usable yet because it needs
one thing only you can provide — an OpenRouter API key — same rule as
every other credential in this project: **don't paste it into a chat with
Claude.**

## 1. Create an account

Sign up at [openrouter.ai](https://openrouter.ai). No card required to use
the free-tier models.

## 2. Generate an API key

Dashboard → Keys → Create Key.

## 3. Model — nothing to do here normally

The function defaults to `openrouter/free`, OpenRouter's own "Free Models
Router" — it auto-routes across whichever free-tier models are currently
live, rather than pinning to one vendor's free slug that could get
discontinued (which is exactly what happened to the model this used to
default to). Only revisit this if `openrouter/free` itself ever stops
working — check `GET https://openrouter.ai/api/v1/models` for current
`pricing.prompt/completion === "0"` models, then set `OPENROUTER_MODEL`
as a secret to override (step 5) without touching code.

## 4. Save the key to a file, not into chat

**Save it outside the repo folder** — e.g. your Downloads folder, not
inside `agerite-field-system\`. A key saved inside the repo can end up
in a commit if it's ever swept up by an `add -A`; this actually happened
once already (caught by GitHub's push protection before it reached the
remote, but it shouldn't have been possible to begin with — `.gitignore`
now blocks `*-api-key.txt` inside the repo as a backstop, but the repo
still isn't the right place to keep it).

```
echo "sk-or-v1-your-real-key" > C:\Users\ASVPC\Downloads\openrouter-api-key.txt
```

Anywhere outside the repo is fine — just tell Claude the exact path so it
can read it directly.

## 5. Set the secrets

Once the key is on disk and reachable, this is what Claude runs (reading
the key from your file, never typed into chat):

```bash
npx supabase secrets set OPENROUTER_API_KEY=<contents of your key file>
```

Optional, only if you're overriding the default model (see step 3):
```bash
npx supabase secrets set OPENROUTER_MODEL=<the model id you chose>
```

## 6. Test it

Sign in as a leadership account (Cindy, Anthony, Melissa, or Ron), open
CRM → Analytics, scroll to "Ask about sales numbers or reports," and ask
something like "which reps have stale accounts?"
