# Running InvestVCS locally

The app has two halves: the React frontend and the Python analyst service in
`ai/`. The frontend cannot run an analysis without the service, so start both.

## Once

```
npm install
npm run ai:install      # installs the Python service dependencies
```

## Every time

```
npm run dev:all
```

That starts the analyst service on `http://127.0.0.1:8123` and Vite together,
and stops both with Ctrl-C. Open the address Vite prints.

Prefer two terminals? `npm run ai` in one, `npm run dev` in the other.

## Real model or canned output

The service decides for itself:

* Credentials in `.env` -> the real model. The workflow page says
  "live model: <name>".
* No credentials -> canned output, and the page says "mock mode, figures are
  illustrative" so nothing invented is mistaken for analysis.

Force either one with `AI_MOCK=1` (canned) or `AI_MOCK=0` (real, and fail
loudly if unconfigured).

`ai/app/config.py` reads `.env` from the repo root, so the credentials live in
one place and the service works however it is started. Real environment
variables always win, so a deployment is never overridden by a local file.

A real run takes about six minutes: the reasoning model spends 30 to 90 seconds
per agent, and agents run three at a time. `AGENT_CONCURRENCY` raises that if
your deployment has the quota for it, but exceeding the quota fails agents
rather than speeding the run up.

## If the workflow page says the service is not answering

It tells you which address it tried and prints the command to fix it. Start the
service and the page reconnects on its own within a few seconds; there is no
need to reload.

## Deploying

`VITE_AI_SERVICE_URL` is read at **build** time, so it must be set on the
frontend service, not only in a local file. Without it a production build has
no address and says so. The Python service needs its own Railway service with
Root Directory set to `ai`.
