// Intake: everything the analyst is given, and how much control the user keeps.
//
// Autonomous is the default because the product's premise is that the AI
// decides. Guided and Manual exist because autonomous must not mean
// uncontrollable.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, FileText, Loader2, Play, Upload, X } from "lucide-react";
import type { InputBundle, SessionMode } from "@/lib/analyst/types";
import { METHODOLOGY_META } from "@/lib/analyst/registry";
import type { CustomAgent } from "@/lib/analyst/service";
import WebsiteImport from "./WebsiteImport";
import { SUPPORTED_DECK_EXTENSIONS, describeBundle, extractDeckText, hasMinimumInput } from "@/lib/analyst/intake";
import { Empty, Eyebrow, Panel, Tag } from "./primitives";

const MODES: { id: SessionMode; label: string; description: string }[] = [
  {
    id: "autonomous",
    label: "Autonomous",
    description: "The analyst decides which methodologies apply, runs them, cross-validates and concludes.",
  },
  {
    id: "guided",
    label: "Guided",
    description: "You choose the methodologies; the analyst still cross-validates and writes the thesis.",
  },
  {
    id: "manual",
    label: "Manual",
    description: "Run individual methodologies on their own, with no synthesis.",
  },
];

export const IntakePanel = ({
  bundle, onBundleChange, mode, onModeChange, chosenIds, onChosenIdsChange, onStart, onCancel, isRunning,
  customAgents = [],
}: {
  bundle: InputBundle;
  onBundleChange: (patch: Partial<InputBundle>) => void;
  mode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  chosenIds: string[];
  onChosenIdsChange: (ids: string[]) => void;
  onStart: () => void;
  onCancel: () => void;
  isRunning: boolean;
  /** The team's own agents, offered for selection beside the built-ins. */
  customAgents?: CustomAgent[];
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [deckLoading, setDeckLoading] = useState(false);

  const coverage = describeBundle(bundle);
  const ready = hasMinimumInput(bundle);
  const needsSelection = mode !== "autonomous" && chosenIds.length === 0;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setDeckError(null);
    setDeckLoading(true);
    try {
      const extracted = await extractDeckText(file);
      onBundleChange({ pitchDeckText: extracted.text, pitchDeckFileName: extracted.fileName });
      if (extracted.warning) setDeckError(extracted.warning);
    } catch (error) {
      setDeckError(error instanceof Error ? error.message : "That file could not be read.");
    } finally {
      setDeckLoading(false);
    }
  };

  /** Built-ins first, then the team's own, so the numbering people are used to
   *  does not shift when someone adds an agent. */
  const selectable = [
    ...METHODOLOGY_META.map((spec) => ({
      id: spec.id, name: spec.name, purpose: spec.purpose, own: false,
    })),
    ...customAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      purpose: agent.purpose || "Added by your team.",
      own: true,
    })),
  ];

  const toggleMethodology = (id: string) => {
    onChosenIdsChange(chosenIds.includes(id) ? chosenIds.filter((item) => item !== id) : [...chosenIds, id]);
  };

  return (
    <div className="space-y-5">
      <Panel title="Startup">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="analyst-name" className="text-xs text-muted-foreground">Name</Label>
            <Input
              id="analyst-name"
              value={bundle.startupName}
              onChange={(event) => onBundleChange({ startupName: event.target.value })}
              placeholder="Company name"
              className="h-9 text-sm"
              disabled={isRunning}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="analyst-narrative" className="text-xs text-muted-foreground">
              What does the company do?
            </Label>
            <Textarea
              id="analyst-narrative"
              value={bundle.narrative}
              onChange={(event) => onBundleChange({ narrative: event.target.value })}
              placeholder="Business, market, product, team, traction, what you are raising. Anything the deck does not cover."
              className="min-h-[120px] resize-y text-sm"
              disabled={isRunning}
            />
            <p className="text-[11px] text-muted-foreground/70">
              Either a description or a deck is enough to start. Both is better.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pitch deck</Label>
            {bundle.pitchDeckText ? (
              <div className="flex items-center gap-3 rounded-lg border border-[var(--rule)] bg-[var(--band)] px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-[var(--accent-ink)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{bundle.pitchDeckFileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(bundle.pitchDeckText.match(/--- Slide /g) ?? []).length || "—"} slides ·{" "}
                    {bundle.pitchDeckText.length.toLocaleString("en-US")} characters extracted
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  disabled={isRunning}
                  onClick={() => onBundleChange({ pitchDeckText: "", pitchDeckFileName: "" })}
                  aria-label="Remove deck"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={isRunning || deckLoading}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--rule)] px-3 py-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent-ink)_40%,transparent)] hover:bg-[var(--band)] disabled:opacity-50"
              >
                {deckLoading
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent-ink)]" />
                  : <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0">
                  <span className="block text-sm text-foreground/85">
                    {deckLoading ? "Reading deck…" : "Upload a deck"}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {SUPPORTED_DECK_EXTENSIONS.join(", ")} · max 15 MB
                  </span>
                </span>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={SUPPORTED_DECK_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }}
            />
            {deckError && <p className="text-xs text-[var(--caution)]">{deckError}</p>}
          </div>
        </div>
      </Panel>

      {/* Reading the company's own site is the cheapest way to fill the
          brief, so it sits above the checklist of what is still missing. */}
      <WebsiteImport
        disabled={isRunning}
        onImport={(brief) =>
          onBundleChange({
            startupName: bundle.startupName || brief.startupName,
            narrative: [bundle.narrative, brief.narrative].filter(Boolean).join(
              String.fromCharCode(10, 10),
            ),
          })
        }
      />

      <Panel title="What the analyst has to work with">
        <ul className="divide-y divide-white/[0.05]">
          {coverage.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              {item.present
                ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--positive)]" />
                : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--rule)]" />}
              <span className={`flex-1 text-sm ${item.present ? "text-foreground/85" : "text-muted-foreground"}`}>
                {item.label}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground/70">{item.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-light leading-relaxed text-muted-foreground/70">
          Data you have already entered elsewhere in InvestVCS — your canvas, financial snapshots, valuation answers and
          readiness checklists — is pulled in automatically and cross-checked against what the analyst reads in the deck.
        </p>
      </Panel>

      <Panel title="Mode">
        <div className="space-y-2">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onModeChange(option.id)}
              disabled={isRunning}
              className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ${
                mode === option.id
                  ? "border-[color-mix(in_srgb,var(--accent-ink)_50%,transparent)] bg-[var(--accent-ink)]/[0.07]"
                  : "border-[var(--rule)] hover:border-[var(--rule)] hover:bg-[var(--band)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    mode === option.id ? "border-[var(--accent-ink)] bg-[var(--accent-ink)]" : "border-[var(--rule)]"
                  }`}
                >
                  {mode === option.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </div>
              <p className="mt-1 pl-[22px] text-xs font-light leading-relaxed text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {mode !== "autonomous" && (
          <div className="mt-5 border-t border-[var(--rule)] pt-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Methodologies</Eyebrow>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() =>
                  onChosenIdsChange(
                    chosenIds.length === selectable.length ? [] : selectable.map((spec) => spec.id),
                  )
                }
              >
                {chosenIds.length === selectable.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] font-light leading-relaxed text-muted-foreground/70">
              Applicability rules still apply: a methodology that cannot produce a meaningful result for this startup is
              skipped and the reason is recorded.
            </p>
            <ul className="mt-3 space-y-1">
              {selectable.map((spec) => (
                <li key={spec.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--band)]">
                    <Checkbox
                      checked={chosenIds.includes(spec.id)}
                      onCheckedChange={() => toggleMethodology(spec.id)}
                      disabled={isRunning}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm text-foreground/85">{spec.name}</span>
                        {spec.own && (
                          <span className="shrink-0 rounded-full border border-[var(--rule)] px-1.5 py-px text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
                            Yours
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] font-light leading-relaxed text-muted-foreground">
                        {spec.purpose}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <div className="space-y-2">
        {isRunning ? (
          <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={onCancel}>
            <X className="h-4 w-4" /> Stop analysis
          </Button>
        ) : (
          <Button
            className="w-full gap-2 rounded-xl"
            disabled={!ready || needsSelection}
            onClick={onStart}
          >
            <Play className="h-4 w-4" />
            {mode === "autonomous" ? "Run autonomous analysis" : mode === "guided" ? "Run guided analysis" : "Run selected methodologies"}
          </Button>
        )}

        {!ready && (
          <p className="text-center text-[11px] text-muted-foreground">
            Add a description of at least a couple of sentences, or upload a deck, to begin.
          </p>
        )}
        {ready && needsSelection && (
          <p className="text-center text-[11px] text-muted-foreground">Select at least one methodology.</p>
        )}
      </div>
    </div>
  );
};

export default IntakePanel;
