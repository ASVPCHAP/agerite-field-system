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

## 3. Confirm the model is still free

The function defaults to `meta-llama/llama-3.1-8b-instruct:free`.
OpenRouter's free-tier catalog changes over time — check
[openrouter.ai/models](https://openrouter.ai/models) (filter by price =
free) and confirm this one's still listed, or pick a different `:free`
model if not. You don't need to touch code to change it — see step 5.

## 4. Save the key to a file, not into chat

```
echo "sk-or-v1-your-real-key" > openrouter-api-key.txt
```

Anywhere on disk under `C:\Users\ASVPC\` is fine — just tell Claude the
path so it can read it directly, the same way `prospect-search`'s and the
Resend SMTP key were handled.

## 5. Set the secrets

Once the key is on disk and reachable, this is what Claude runs (reading
the key from your file, never typed into chat):

```bash
npx supabase secrets set OPENROUTER_API_KEY=<contents of your key file>
```

Optional, only if you picked a different model in step 3:
```bash
npx supabase secrets set OPENROUTER_MODEL=<the model id you chose>
```

## 6. Test it

Sign in as a leadership account (Cindy, Anthony, Melissa, or Ron), open
CRM → Analytics, scroll to "Ask about sales numbers or reports," and ask
something like "which reps have stale accounts?"
