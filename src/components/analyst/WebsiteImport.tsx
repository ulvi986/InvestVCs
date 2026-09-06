// Reading a company from its website.
//
// Paste the address, the service reads the page and says whether there is
// enough there for the full analysis. It runs in seconds rather than the
// twelve-agent minutes, so it is worth doing before committing to a run.
//
// The service does the fetching, not the browser: a page on another origin is
// not readable from JavaScript. That is also why this is a field here rather
// than a browser extension - nothing to install.

import { useState } from "react";
import { Globe, Loader2, Check, AlertTriangle } from "lucide-react";
import { ServiceError, isServiceConfigured, screenWebsite } from "@/lib/analyst/service";
import type { ScreenResult } from "@/lib/analyst/service";
import { Eyebrow, Panel } from "./primitives";

/** Bands rather than a percentage: two decimal places would imply a precision
 *  a reading of a marketing page does not have. */
const evidenceBand = (value: number | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "unknown";
  if (value >= 0.66) return "strong";
  if (value >= 0.33) return "mixed";
  return "thin";
};

export const WebsiteImport = ({
  onImport, disabled = false,
}: {
  /** Hands the page to the brief. The caller decides what to do with it. */
  onImport: (brief: { startupName: string; narrative: string; sourceUrl: string }) => void;
  disabled?: boolean;
}) => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const configured = isServiceConfigured();
  const busy = reading || disabled;

  const read = async () => {
    const address = url.trim();
    if (!address || busy || !configured) return;

    setReading(true);
    setError(null);
    setResult(null);
    setImported(false);

    try {
      const screened = await screenWebsite(address);
      setResult(screened);
      // The page itself goes into the brief straight away: the point is to save
      // the user retyping what the site already says.
      onImport({
        startupName: screened.company || "",
        narrative: screened.brief || "",
        sourceUrl: screened.url || address,
      });
      setImported(true);
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : "That address could not be read.",
      );
    } finally {
      setReading(false);
    }
  };

  return (
    <Panel title="From the company's website">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-3)]"
            aria-hidden="true"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void read();
              }
            }}
            disabled={busy || !configured}
            placeholder="company.com"
            aria-label="Company website address"
            spellCheck={false}
            className="w-full rounded-[var(--radius)] border border-[var(--rule-strong)] bg-[var(--page)]
                       py-2 pl-9 pr-3 text-[13.5px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]
                       focus:border-[var(--accent-ink)] focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={() => void read()}
          disabled={!url.trim() || busy || !configured}
          className="shrink-0 rounded-[var(--radius)] bg-[var(--accent-ink)] px-3.5 py-2 text-[13px]
                     font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Read"}
        </button>
      </div>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--ink-3)]">
        {reading
          ? "Reading the page…"
          : "The home or product page works best — wherever the company describes itself."}
      </p>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--negative)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {result && (
        <div className="mt-4 border-t border-[var(--rule)] pt-4">
          <p
            className={`text-[10.5px] font-semibold uppercase tracking-[0.09em] ${
              result.worthFullAnalysis ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {result.worthFullAnalysis ? "Worth a full analysis" : "Not yet worth a full analysis"}
          </p>

          <p className="mt-1.5 text-[14px] text-[var(--ink-1)]">
            {result.company || "Company not named on that page"}
          </p>
          {result.oneLiner && (
            <p className="measure mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">{result.oneLiner}</p>
          )}

          <dl className="mt-3 flex gap-8">
            <div>
              <dt className="kicker">Stage</dt>
              <dd className="mt-1 text-[13px] capitalize text-[var(--ink-1)]">
                {(result.stage || "unclear").replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="kicker">Evidence</dt>
              <dd className="mt-1 text-[13px] text-[var(--ink-1)]">{evidenceBand(result.evidenceQuality)}</dd>
            </div>
          </dl>

          {result.signals?.length > 0 && (
            <div className="mt-4">
              <Eyebrow>What the site evidences</Eyebrow>
              <ul className="mt-2 space-y-1.5">
                {result.signals.slice(0, 5).map((item, index) => (
                  <li key={index} className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {result.flags?.length > 0 && (
            <div className="mt-4">
              <Eyebrow>What it does not establish</Eyebrow>
              <ul className="mt-2 space-y-1.5">
                {result.flags.slice(0, 5).map((item, index) => (
                  <li key={index} className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendation && (
            <p className="mt-4 rounded-[var(--radius)] bg-[var(--band)] px-3 py-2.5 text-[12.5px]
                          leading-relaxed text-[var(--ink-1)]">
              {result.recommendation}
            </p>
          )}

          {imported && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--positive)]">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              The page has been added to the brief below. Add a deck if you have one, then Run.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};

export default WebsiteImport;
