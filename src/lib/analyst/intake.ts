// Input normalisation: turn whatever the user has (a deck, a paragraph, the
// answers they already gave in the manual calculators, a financial snapshot)
// into the single InputBundle the agents read from.

import type { InputBundle } from "./types";

export const SUPPORTED_DECK_EXTENSIONS = [".pptx", ".ppt", ".txt", ".md"];

export const MAX_DECK_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Pull the text out of a PowerPoint file, slide by slide.
 *
 * Previously inline in `VentureAnalysis.tsx`; shared now so the pitch-deck
 * analyser and the autonomous analyst read decks identically.
 */
export async function extractPptxText(file: File | Blob): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0", 10);
      return numA - numB;
    });

  const slides: string[] = [];
  for (const path of slidePaths) {
    const xml = await zip.files[path].async("text");
    const texts: string[] = [];
    const regex = /<a:t>(.*?)<\/a:t>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const text = match[1].trim();
      if (text) texts.push(decodeXmlEntities(text));
    }
    if (texts.length) {
      const slideNumber = path.match(/slide(\d+)/)?.[1] ?? "?";
      slides.push(`--- Slide ${slideNumber} ---\n${texts.join("\n")}`);
    }
  }

  return slides.length ? slides.join("\n\n") : "";
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export interface DeckExtraction {
  text: string;
  fileName: string;
  slideCount: number;
  warning?: string;
}

export async function extractDeckText(file: File): Promise<DeckExtraction> {
  const name = file.name.toLowerCase();

  if (file.size > MAX_DECK_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 15 MB.`);
  }

  if (name.endsWith(".pptx") || name.endsWith(".ppt")) {
    const text = await extractPptxText(file);
    if (!text) {
      return {
        text: "",
        fileName: file.name,
        slideCount: 0,
        warning: "No text could be read from this deck — it may be image-only. Describe the startup in the notes field instead.",
      };
    }
    return { text, fileName: file.name, slideCount: (text.match(/--- Slide /g) ?? []).length };
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const text = await file.text();
    return { text, fileName: file.name, slideCount: 0 };
  }

  throw new Error(
    `${file.name} is not a supported format. Upload ${SUPPORTED_DECK_EXTENSIONS.join(", ")}, or paste the content into the notes field.`,
  );
}

export function emptyBundle(): InputBundle {
  return {
    startupName: "",
    narrative: "",
    pitchDeckText: "",
    pitchDeckFileName: "",
    bmc: {},
    financialSnapshot: null,
    financialHistory: [],
    manual: {
      berkusAnswers: [],
      scorecardAnswers: [],
      scorecardMedian: 0,
      riskAnswers: [],
      vcAnswers: null,
      chicagoAnswers: null,
      trlAnswers: {},
      crlAnswers: {},
      frlAnswers: {},
    },
    corrections: {},
    gapAnswers: {},
  };
}

export interface BundleSources {
  startupName?: string;
  narrative?: string;
  deck?: { text: string; fileName: string } | null;
  bmc?: Record<string, string> | null;
  financialSnapshot?: Record<string, any> | null;
  financialHistory?: Record<string, any>[] | null;
  manual?: Partial<InputBundle["manual"]> | null;
  corrections?: Record<string, unknown> | null;
  gapAnswers?: Record<string, string> | null;
}

export function buildInputBundle(sources: BundleSources): InputBundle {
  const base = emptyBundle();

  return {
    startupName: (sources.startupName ?? "").trim() || base.startupName,
    narrative: sources.narrative ?? "",
    pitchDeckText: sources.deck?.text ?? "",
    pitchDeckFileName: sources.deck?.fileName ?? "",
    bmc: sources.bmc ?? {},
    financialSnapshot: sources.financialSnapshot ?? null,
    financialHistory: sources.financialHistory ?? [],
    manual: { ...base.manual, ...(sources.manual ?? {}) },
    corrections: sources.corrections ?? {},
    gapAnswers: sources.gapAnswers ?? {},
  };
}

/** What the intake screen shows as "the analyst has this to work with". */
export interface BundleCoverage {
  key: string;
  label: string;
  present: boolean;
  detail: string;
}

export function describeBundle(bundle: InputBundle): BundleCoverage[] {
  const manual = bundle.manual;
  const answered = (values: (number | null)[] | undefined) =>
    (values ?? []).filter((value) => value !== null && value !== undefined).length;

  const berkus = answered(manual?.berkusAnswers);
  const scorecard = answered(manual?.scorecardAnswers);
  const risk = answered(manual?.riskAnswers);
  const readinessDone = [manual?.trlAnswers, manual?.crlAnswers, manual?.frlAnswers]
    .filter((answers) => Object.keys(answers ?? {}).length > 0).length;
  const bmcFilled = Object.values(bundle.bmc ?? {}).filter((value) => String(value ?? "").trim()).length;

  return [
    {
      key: "narrative",
      label: "Description",
      present: bundle.narrative.trim().length > 0,
      detail: bundle.narrative.trim() ? `${bundle.narrative.trim().split(/\s+/).length} words` : "Not provided",
    },
    {
      key: "deck",
      label: "Pitch deck",
      present: bundle.pitchDeckText.length > 0,
      detail: bundle.pitchDeckText
        ? `${bundle.pitchDeckFileName} · ${(bundle.pitchDeckText.match(/--- Slide /g) ?? []).length || "—"} slides`
        : "Not uploaded",
    },
    {
      key: "bmc",
      label: "Business Model Canvas",
      present: bmcFilled > 0,
      detail: bmcFilled ? `${bmcFilled}/9 blocks` : "Not filled in",
    },
    {
      key: "financials",
      label: "Financial snapshot",
      present: Boolean(bundle.financialSnapshot),
      detail: bundle.financialSnapshot
        ? `Latest of ${bundle.financialHistory.length || 1} snapshot(s)`
        : "Not provided",
    },
    {
      key: "valuation",
      label: "Founder valuation inputs",
      present: berkus + scorecard + risk > 0,
      detail: berkus + scorecard + risk > 0
        ? `Berkus ${berkus}/5 · Scorecard ${scorecard}/7 · Risk ${risk}/12`
        : "Not completed",
    },
    {
      key: "readiness",
      label: "Readiness checklists",
      present: readinessDone > 0,
      detail: readinessDone ? `${readinessDone}/3 completed (TRL/CRL/FRL)` : "Not completed",
    },
  ];
}

/** Enough to attempt an analysis at all. */
export function hasMinimumInput(bundle: InputBundle): boolean {
  return (
    bundle.narrative.trim().length >= 40 ||
    bundle.pitchDeckText.trim().length >= 200 ||
    Object.values(bundle.bmc ?? {}).filter((value) => String(value ?? "").trim()).length >= 3
  );
}
