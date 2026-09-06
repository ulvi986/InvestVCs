# InvestVCS Screener

A browser extension that reads the company website you are on and says whether
it is worth the full analysis.

## Why it exists separately from the web app

The full pipeline is twelve agents and several minutes of model time. That is
the right cost for a company you are seriously considering and the wrong cost
for one you have just landed on. This is the cheap first pass: one model call
over the text of the page, seconds rather than minutes.

It deliberately does not produce a valuation. A number derived from a marketing
site would have nothing behind it, and not producing those is the whole point of
the product. What it returns is what the page evidences, what it conspicuously
avoids saying, and whether to go further.

## Installing it

It is unpacked, not on the Chrome Web Store.

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** and choose this `extension/` directory

Firefox works the same way through `about:debugging` → **This Firefox** → **Load
Temporary Add-on**, pointing at `manifest.json`.

## Pointing it at your service

Open the popup, click **Settings**, and set:

| Field | Default | What it is |
| --- | --- | --- |
| Analyst service | `https://investvcs-analyst.onrender.com` | Where screening happens |
| Web app | `https://investvcs.vercel.app` | Where “Run the full analysis” opens |

Nothing is sent anywhere else. The page text goes to your analyst service and
nowhere but there.

## Using it

Open a company's site — its home or product page, where it describes itself —
and click the extension. It reads the rendered page rather than refetching the
URL, so client-rendered sites and pages behind a login work.

You get a verdict, what the site evidences, what it does not establish, and a
recommendation. **Run the full analysis** opens the web app with the page
already loaded into the brief, so the agents start from the site rather than
from you retyping it.

## How the handover works

The page text is far too large for a URL, so the service keeps the extracted
brief for an hour under an id and the web app collects it at
`/workflow?brief=<id>`. A brief nobody collects expires rather than
accumulating; an expired one says so in the app instead of loading nothing in
silence.

## CORS

The extension's origin is `chrome-extension://<id>`, and the id is assigned at
install time, so it cannot be listed in `CORS_ORIGINS` in advance. The service
matches extension origins by pattern instead — see `allow_origin_regex` in
`ai/app/main.py`. Your `CORS_ORIGINS` still needs to name the web app's domain.

## What it will not do

- It will not value a company from a marketing page.
- It will not screen a page with almost no text on it; it says so and asks for
  the home or product page.
- It will not invent a company around a blog post or a news article. It says
  that is what it is looking at.
