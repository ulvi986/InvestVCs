# Deploying InvestVCS

Two halves, two hosts. That split is not a preference; it is forced by how a
run behaves.

## Frontend -> Vercel

Live: https://investvcs.vercel.app

That is the public alias. The per-deployment host
(`investvcs-<hash>-ulvi986s-projects.vercel.app`) sits behind Vercel SSO and
302s anonymous visitors to a login, so it is not the address to hand out —
and `CORS_ORIGINS` on the analyst service names the alias, not it.

```
npx vercel deploy --prod
```

`vercel.json` sets `outputDirectory: dist` and rewrites every path to
`/index.html`, which react-router needs: without it, loading `/workflow`
directly returns 404.

### Environment variables (Vercel project settings)

Only `VITE_*` values belong here. Vite inlines them into the JS bundle, so
they are public by definition.

| Variable | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | set |
| `VITE_SUPABASE_PROJECT_ID` | set |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | set. Verified `role: anon`, so it is safe to expose; Row Level Security is what protects the data |
| `VITE_AI_SERVICE_URL` | set to `https://investvcs-analyst.onrender.com`, and verified present in the production bundle |

Never put `AZURE_AI_API_KEY` or any other secret behind a `VITE_` name. The
33 non-VITE keys in `.env` stay out of Vercel entirely; `.vercelignore`
excludes the file from the upload.

## Analyst service -> anywhere that runs a long-lived process

Not Vercel, and not any serverless platform:

| | Needed | Vercel function |
| --- | --- | --- |
| SSE stream held open | ~380s, measured | 300s maximum |
| Run state | in process (`ai/runs.py`) | no sticky instance |
| `POST /runs/{id}/approve` | must reach the streaming instance | lands anywhere |

A run would be cut off mid-analysis and human approvals would fail.

`ai/Dockerfile` builds an image that runs on Render, Fly.io, Railway or a VPS.
`render.yaml` is a ready blueprint for Render. Run **one instance** for the
same reason approvals need a sticky target.

### The live service has drifted from the blueprint

`investvcs-analyst` (srv-dadbs0gae00c739kaij0) was created by hand rather than
imported from `render.yaml`, so the two disagree:

| | `render.yaml` | Live service |
| --- | --- | --- |
| Runtime | `docker`, via `ai/Dockerfile` | native `python`, `pip install -r ai/requirements.txt` |
| Plan | `starter` | **`free`** |
| Health check | `/health` | not set |

The plan is the one that bites. The blueprint asks for `starter` precisely
because free instances sleep, and a sleeping instance drops a run that is
mid-stream along with the in-process state its approval needs. Moving the
service to `starter` costs money, so it is left as a decision rather than a
change made in passing.

Required on that host: `AZURE_AI_FOUNDRY_ENDPOINT`, `AZURE_AI_API_KEY`,
`AZURE_AI_MODEL=gpt-5-mini`, `AZURE_OPENAI_API_VERSION=2025-11-15-preview`,
`AI_MOCK=0`, and `CORS_ORIGINS` set to the Vercel domain.

## Order matters

`VITE_AI_SERVICE_URL` is read at build time, so deploy the analyst service
first, then set the variable and redeploy the frontend. Until then the
workflow page says the service address is not set, which is accurate.

## A trap worth remembering

`.vercelignore` patterns must be anchored with a leading slash. A bare
`supabase` also matched `src/integrations/supabase/`, silently dropping the
Supabase client from the upload; the build then failed with
"Could not load .../integrations/supabase/client".

## Reading a company's website

The Company tab takes a URL and the service reads the page: one model call that
says whether the full analysis is worth running, and drops the page into the
brief so nobody retypes what the site already says.

The fetching happens on the service, not in the browser, because a page on
another origin is not readable from JavaScript. That means the service makes
outbound requests to addresses users choose, which is a server-side request
forgery surface and is guarded as one in `ai/app/fetchpage.py`: http(s) only,
standard ports only, every hop resolved and refused if it lands on a private,
loopback, link-local or otherwise non-public address, redirects re-checked
rather than trusted, and size and time capped. The residual DNS-rebinding risk
is documented in that module rather than left implied.

This replaced a browser extension. Requiring an install was the wrong shape for
something the site can do itself; the extension is in the history if it is ever
wanted again.

## Supabase

Project `StartupEval` (`gdzzmzostnlmecbwyysy`), Postgres 17, region us-west-1.

### What was wrong

The three analyst tables did not exist, so every run failed to persist and the
console filled with "Could not find the table 'public.analysis_sessions'".
Runs still worked; only history and session recovery were lost.

Underneath that was a migration-history mismatch. The remote history held 15
entries written by the dashboard tooling with timestamps about two seconds
off the local filenames, so the CLI saw almost every local migration as
unapplied even though the schema was current.

### What was done

1. Confirmed the real state by listing live tables rather than trusting the
   history: 18 tables present, exactly the 3 analyst tables missing.
2. `supabase migration repair --status applied` for the 26 local migrations
   whose schema was already present.
3. `supabase migration repair --status reverted` for the 15 phantom remote
   entries. Metadata only; no SQL was reverted.
4. `supabase db push` applied the one genuinely pending migration,
   `20260901120000_investment_analysis_sessions.sql`. It is additive
   throughout: `create table if not exists`, `create index if not exists`,
   and policies dropped-if-exists before being recreated. No destructive
   statement anywhere in it.

### Verified

| Check | Result |
| --- | --- |
| `analysis_sessions`, `analysis_agent_runs`, `analysis_evidence` | present, 21 tables total |
| Pending migrations | 0 |
| RLS on all three | anonymous request returns 200 with an empty set, so the policy filters rather than the table being exposed |
| Write path | starting a run created a session row |
| Read path | the run then appeared under "Earlier runs" |
| Console | the schema-cache error is gone |

One probe row named "Supabase Persistence Check" remains from that test.
