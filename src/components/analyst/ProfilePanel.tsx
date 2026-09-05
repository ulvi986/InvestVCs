// What the analyst understood about the startup, and the chance to correct it.
//
// Extraction errors propagate into every downstream methodology, so the
// highest-leverage human intervention is here rather than at the conclusion.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, RotateCcw } from "lucide-react";
import type { StartupProfile, StartupStage } from "@/lib/analyst/types";
import { STARTUP_STAGES } from "@/lib/analyst/types";
import { inferenceShare } from "@/lib/analyst/confidence";
import { ConfidenceMeter, Empty, Eyebrow, Figure, Panel, Row, Tag, formatUsd } from "./primitives";
import { EvidenceList } from "./MethodologyResults";

const STAGE_LABEL: Record<StartupStage, string> = {
  idea: "Idea",
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  growth: "Growth",
};

export interface ProfileCorrections {
  stage?: StartupStage;
  revenueUsd?: number;
  tamUsd?: number;
  runwayMonths?: number;
  seekingUsd?: number;
  note?: string;
}

export const ProfilePanel = ({
  profile, onApplyCorrections, applying,
}: {
  profile: StartupProfile | null;
  onApplyCorrections?: (corrections: ProfileCorrections) => void;
  applying?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileCorrections>({});

  if (!profile) {
    return (
      <Panel title="Startup profile">
        <Empty>The analyst has not read the material yet.</Empty>
      </Panel>
    );
  }

  const startEditing = () => {
    setDraft({
      stage: profile.stage,
      revenueUsd: profile.traction.revenueUsd ?? undefined,
      tamUsd: profile.market.tam ?? undefined,
      runwayMonths: profile.financials.runwayMonths ?? undefined,
      seekingUsd: profile.fundraising.seeking ?? undefined,
    });
    setEditing(true);
  };

  const numberField = (
    key: keyof ProfileCorrections,
    label: string,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={(draft[key] as number | undefined) ?? ""}
        placeholder={placeholder}
        onChange={(event) =>
          setDraft((prev) => ({
            ...prev,
            [key]: event.target.value === "" ? undefined : Number(event.target.value),
          }))
        }
        className="h-9 text-sm"
      />
    </div>
  );

  return (
    <Panel
      title="Startup profile"
      subtitle={profile.oneLiner}
      actions={
        onApplyCorrections && !editing ? (
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" /> Correct
          </Button>
        ) : null
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Tag tone="accent">{STAGE_LABEL[profile.stage]}</Tag>
        {profile.industries.map((industry) => (
          <Tag key={industry} tone="neutral">{industry}</Tag>
        ))}
        {profile.geography && profile.geography !== "not stated" && <Tag tone="muted">{profile.geography}</Tag>}
      </div>

      <div className="mb-5">
        <ConfidenceMeter value={profile.evidenceQuality} label="Evidence quality of this profile" />
        <p className="mt-1.5 text-xs font-light text-muted-foreground">
          How much of the profile traces to data the founder actually provided.{" "}
          <Figure>{(inferenceShare(profile.evidence) * 100).toFixed(0)}%</Figure> of the extracted claims are the
          model's own inference rather than something stated in the material.
        </p>
      </div>

      {editing && onApplyCorrections && (
        <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--accent-ink)_25%,transparent)] bg-[var(--accent-ink)]/[0.05] p-4">
          <Eyebrow>Correct the extracted data</Eyebrow>
          <p className="mt-1.5 text-xs font-light leading-relaxed text-muted-foreground">
            Corrections are passed to every agent as authoritative and the analysis is re-run from the start.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stage</Label>
              <Select
                value={draft.stage ?? profile.stage}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, stage: value as StartupStage }))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STARTUP_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{STAGE_LABEL[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {numberField("revenueUsd", "Annual revenue (USD)", "e.g. 180000")}
            {numberField("tamUsd", "TAM (USD)", "e.g. 5000000000")}
            {numberField("runwayMonths", "Runway (months)", "e.g. 11")}
            {numberField("seekingUsd", "Raising (USD)", "e.g. 1500000")}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              size="sm"
              className="gap-2 rounded-lg"
              disabled={applying}
              onClick={() => { onApplyCorrections(draft); setEditing(false); }}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${applying ? "animate-spin" : ""}`} />
              Apply and re-analyse
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div>
          <Eyebrow>Business model</Eyebrow>
          <div className="mt-2">
            <Row label="Type" value={profile.businessModel.type} />
            <Row label="Revenue model" value={profile.businessModel.revenueModel} />
            <Row label="Customer" value={profile.businessModel.customerType} />
            <Row label="Pricing" value={profile.businessModel.pricing} />
          </div>
        </div>

        <div>
          <Eyebrow>Market</Eyebrow>
          <div className="mt-2">
            <Row label="TAM" value={<Figure>{formatUsd(profile.market.tam)}</Figure>} />
            <Row label="SAM" value={<Figure>{formatUsd(profile.market.sam)}</Figure>} />
            <Row label="SOM" value={<Figure>{formatUsd(profile.market.som)}</Figure>} />
            <Row
              label="Growth"
              value={<Figure>{profile.market.growthRatePct !== null ? `${profile.market.growthRatePct}%` : "—"}</Figure>}
            />
            <Row label="Sizing basis" value={profile.market.sizingBasis} />
          </div>
        </div>

        <div>
          <Eyebrow>Traction</Eyebrow>
          <div className="mt-2">
            <Row label="Customers" value={<Figure>{profile.traction.customers?.toLocaleString("en-US") ?? "—"}</Figure>} />
            <Row label="Revenue" value={<Figure>{formatUsd(profile.traction.revenueUsd)}</Figure>} />
            <Row label="Growth" value={profile.traction.growthNote || "—"} />
            <Row label="Pilots / LOIs" value={profile.traction.pilots || "—"} />
          </div>
        </div>

        <div>
          <Eyebrow>Financials</Eyebrow>
          <div className="mt-2">
            <Row label="Monthly burn" value={<Figure>{formatUsd(profile.financials.monthlyBurnUsd)}</Figure>} />
            <Row
              label="Runway"
              value={<Figure>{profile.financials.runwayMonths !== null ? `${profile.financials.runwayMonths} mo` : "—"}</Figure>}
            />
            <Row
              label="Gross margin"
              value={<Figure>{profile.financials.grossMarginPct !== null ? `${profile.financials.grossMarginPct}%` : "—"}</Figure>}
            />
            <Row
              label="Churn"
              value={<Figure>{profile.financials.churnRatePct !== null ? `${profile.financials.churnRatePct}%` : "—"}</Figure>}
            />
          </div>
        </div>

        <div>
          <Eyebrow>Team</Eyebrow>
          <div className="mt-2">
            <Row label="Size" value={<Figure>{profile.team.size?.toLocaleString("en-US") ?? "—"}</Figure>} />
            <Row label="Founders" value={profile.team.founders} />
            <Row label="Domain expertise" value={profile.team.domainExpertise} />
            <Row label="Gaps" value={profile.team.gaps || "—"} />
          </div>
        </div>

        <div>
          <Eyebrow>Technology</Eyebrow>
          <div className="mt-2">
            <Row label="Core technology" value={profile.technology.coreTech} />
            <Row label="TRL estimate" value={<Figure>{profile.technology.trlEstimate ?? "—"}</Figure>} />
            <Row label="IP position" value={profile.technology.ipPosition} />
            <Row label="Technical risk" value={profile.technology.technicalRisk || "—"} />
          </div>
        </div>

        <div>
          <Eyebrow>Competition</Eyebrow>
          <div className="mt-2">
            <Row label="Named competitors" value={profile.competition.namedCompetitors.join(", ") || "None named"} />
            <Row label="Claimed defensibility" value={profile.competition.defensibility} />
          </div>
        </div>

        <div>
          <Eyebrow>Fundraising</Eyebrow>
          <div className="mt-2">
            <Row label="Raising" value={<Figure>{formatUsd(profile.fundraising.seeking)}</Figure>} />
            <Row label="Instrument" value={profile.fundraising.instrument} />
            <Row label="Use of funds" value={profile.fundraising.useOfFunds || "—"} />
          </div>
        </div>
      </div>

      {profile.riskFlags.length > 0 && (
        <div className="mt-6 border-t border-[var(--rule)] pt-5">
          <Eyebrow>Flagged on first read</Eyebrow>
          <ul className="mt-2 space-y-1.5">
            {profile.riskFlags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm font-light leading-relaxed text-muted-foreground">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--caution)]" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.evidence.length > 0 && (
        <div className="mt-6 border-t border-[var(--rule)] pt-5">
          <Eyebrow>Extraction evidence</Eyebrow>
          <div className="mt-2.5">
            <EvidenceList evidence={profile.evidence} />
          </div>
        </div>
      )}
    </Panel>
  );
};

export default ProfilePanel;
