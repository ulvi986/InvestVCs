// Render a finished analysis as a Markdown memo, so the report can leave the
// screen and go into a deal folder or an email.

import type { Critique, Disagreement, InvestmentThesis, MethodologyResult, StartupProfile } from "./types";
import { getMethodology } from "./registry";

const usd = (value: number | null | undefined): string =>
  value === null || value === undefined || !isFinite(value) ? "—" : `$${Math.round(value).toLocaleString("en-US")}`;

const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_invest: "Strong Invest",
  invest: "Invest",
  consider: "Consider",
  watch: "Watch",
  pass: "Pass",
};

const bullets = (items: string[]): string =>
  items.length ? items.map((item) => `- ${item}`).join("\n") : "_None recorded._";

export function thesisToMarkdown(input: {
  startupName: string;
  profile: StartupProfile | null;
  thesis: InvestmentThesis | null;
  results: Record<string, MethodologyResult>;
  critique: Critique | null;
  disagreements: Disagreement[];
  generatedAt?: Date;
}): string {
  const { startupName, profile, thesis, results, critique, disagreements } = input;
  const at = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Investment Analysis — ${startupName || profile?.name || "Untitled startup"}`);
  lines.push(`_Generated ${at} by the InvestVCS autonomous investment analyst. AI-generated analysis — verify before acting on it._`);
  lines.push("");

  if (!thesis) {
    lines.push("## Status");
    lines.push("The investment thesis could not be generated. Individual methodology results follow.");
    lines.push("");
  } else {
    lines.push("## Recommendation");
    lines.push(
      `**${RECOMMENDATION_LABEL[thesis.recommendation] ?? thesis.recommendation}** · confidence ${thesis.confidence.overall.toFixed(2)}`,
    );
    lines.push("");
    lines.push(thesis.recommendationReasoning);
    lines.push("");

    lines.push("## Executive Summary");
    lines.push(thesis.executiveSummary);
    lines.push("");

    lines.push("## Investment Thesis");
    lines.push(thesis.thesis);
    lines.push("");
  }

  if (profile) {
    lines.push("## Startup Overview");
    lines.push(`- **What it is:** ${profile.oneLiner}`);
    lines.push(`- **Stage:** ${profile.stage} — ${profile.stageRationale}`);
    lines.push(`- **Sector:** ${profile.industries.join(", ")}`);
    lines.push(`- **Geography:** ${profile.geography}`);
    lines.push(`- **Business model:** ${profile.businessModel.type}; ${profile.businessModel.revenueModel}`);
    lines.push(`- **Traction:** ${profile.traction.customers ?? "—"} customers, revenue ${usd(profile.traction.revenueUsd)}`);
    lines.push(`- **Raising:** ${usd(profile.fundraising.seeking)} (${profile.fundraising.instrument})`);
    lines.push("");
  }

  if (thesis?.sections.length) {
    thesis.sections.forEach((section) => {
      lines.push(`## ${section.title}`);
      lines.push(`**Score ${section.score10.toFixed(1)}/10 · confidence ${section.confidence.toFixed(2)}**`);
      lines.push("");
      lines.push(section.narrative);
      if (section.evidence.length) {
        lines.push("");
        lines.push("**Evidence**");
        lines.push(bullets(section.evidence));
      }
      if (section.keyAssumptions.length) {
        lines.push("");
        lines.push("**Key assumptions**");
        lines.push(bullets(section.keyAssumptions));
      }
      if (section.missingInformation.length) {
        lines.push("");
        lines.push("**Missing information**");
        lines.push(bullets(section.missingInformation));
      }
      lines.push("");
    });
  }

  lines.push("## Valuation");
  if (thesis?.valuation.reconciled && thesis.valuation.reconciled.range.point > 0) {
    const reconciled = thesis.valuation.reconciled;
    lines.push(
      `**Reconciled range: ${usd(reconciled.range.low)} – ${usd(reconciled.range.high)}** (point estimate ${usd(reconciled.range.point)}, confidence ${reconciled.confidence.toFixed(2)})`,
    );
    lines.push("");
    lines.push(`_Method:_ ${reconciled.method}`);
    if (reconciled.explanation) {
      lines.push("");
      lines.push(reconciled.explanation);
    }
    lines.push("");
    lines.push("| Methodology | Low | Point | High | Confidence |");
    lines.push("| --- | ---: | ---: | ---: | ---: |");
    thesis.valuation.perMethodology.forEach((entry) => {
      lines.push(
        `| ${entry.name} | ${usd(entry.range?.low)} | ${usd(entry.range?.point)} | ${usd(entry.range?.high)} | ${entry.confidence.toFixed(2)} |`,
      );
    });
    lines.push("");
    lines.push(`_Spread across methodologies: ${isFinite(reconciled.spreadRatio) ? `${reconciled.spreadRatio.toFixed(2)}×` : "—"}; agreement ${(reconciled.agreement * 100).toFixed(0)}%._`);
    if (reconciled.excluded.length) {
      lines.push("");
      lines.push("**Excluded from the point estimate**");
      lines.push(bullets(reconciled.excluded.map((item) => `${getMethodology(item.methodologyId)?.name ?? item.methodologyId}: ${item.reason}`)));
    }
    if (thesis.valuation.keyAssumptions.length) {
      lines.push("");
      lines.push("**Key valuation assumptions**");
      lines.push(bullets(thesis.valuation.keyAssumptions));
    }
  } else {
    lines.push("_No methodology produced a usable valuation for this startup._");
  }
  lines.push("");

  const explainedDisagreements = disagreements.filter((item) => item.rootCause || item.explanation);
  if (explainedDisagreements.length) {
    lines.push("## Where the Methodologies Disagree");
    explainedDisagreements.forEach((item) => {
      lines.push(`### ${item.topic} (${item.severity})`);
      lines.push(item.values.map((value) => `${value.label}: ${value.value.toLocaleString("en-US")}`).join(" · "));
      if (item.rootCause) { lines.push(""); lines.push(`**Root cause:** ${item.rootCause}`); }
      if (item.explanation) { lines.push(""); lines.push(item.explanation); }
      if (item.moreCredible && item.moreCredible !== "unresolved") {
        lines.push("");
        lines.push(`**More credible here:** ${getMethodology(item.moreCredible)?.name ?? item.moreCredible}`);
      }
      if (item.missingInfo.length) {
        lines.push("");
        lines.push(`**Would resolve it:** ${item.missingInfo.join("; ")}`);
      }
      lines.push("");
    });
  }

  lines.push("## Risk Analysis");
  if (thesis?.risks.length) {
    thesis.risks.forEach((risk) => {
      lines.push(`- **${risk.title}** (${risk.severity}, likelihood ${risk.likelihood.toFixed(2)}) — ${risk.description}${risk.mitigation ? ` _Mitigation:_ ${risk.mitigation}` : ""}`);
    });
  } else {
    lines.push("_No risks recorded._");
  }
  lines.push("");

  lines.push("## Missing Information");
  if (thesis?.missingInformation.length) {
    thesis.missingInformation.forEach((gap) => {
      lines.push(`- **${gap.field}** — ${gap.why} _Ask:_ ${gap.question}`);
    });
  } else {
    lines.push("_Nothing material was flagged as missing._");
  }
  lines.push("");

  lines.push("## Methodology Selection");
  if (thesis?.methodologySelectionExplanation.length) {
    thesis.methodologySelectionExplanation.forEach((entry) => {
      lines.push(`- **${entry.name}** — ${entry.used ? "applied" : "not applied"}: ${entry.reason}`);
    });
  } else {
    lines.push(bullets(Object.values(results).map((result) => `${result.name}: ${result.status}`)));
  }
  lines.push("");

  if (critique) {
    lines.push("## Critic Review");
    lines.push(`**Verdict:** ${critique.verdict} · confidence ceiling ${critique.confidenceCeiling.toFixed(2)}`);
    lines.push("");
    lines.push(critique.summary);
    if (critique.redFlags.length) {
      lines.push("");
      lines.push("**Red flags**");
      lines.push(bullets(critique.redFlags.map((flag) => `${flag.title} (${flag.severity}) — ${flag.detail}`)));
    }
    if (critique.unsupportedAssumptions.length) {
      lines.push("");
      lines.push("**Unsupported assumptions**");
      lines.push(bullets(critique.unsupportedAssumptions.map((item) => `${item.claim} — ${item.why}`)));
    }
    if (critique.contradictions.length) {
      lines.push("");
      lines.push("**Contradictions**");
      lines.push(bullets(critique.contradictions.map((item) => `"${item.statementA}" vs "${item.statementB}" — ${item.why}`)));
    }
    lines.push("");
  }

  if (thesis) {
    lines.push("## Confidence Analysis");
    lines.push(`**Overall confidence ${thesis.confidence.overall.toFixed(2)}** · evidence quality ${thesis.confidence.evidenceQuality.toFixed(2)} · methodology coverage ${(thesis.confidence.coverage * 100).toFixed(0)}%`);
    if (thesis.confidence.drivers.length) {
      lines.push("");
      lines.push("**Supporting**");
      lines.push(bullets(thesis.confidence.drivers));
    }
    if (thesis.confidence.caveats.length) {
      lines.push("");
      lines.push("**Caveats**");
      lines.push(bullets(thesis.confidence.caveats));
    }
    lines.push("");

    lines.push("## Scenarios");
    [thesis.bullCase, thesis.baseCase, thesis.bearCase].forEach((scenario) => {
      lines.push(`### ${scenario.label} — ${(scenario.probability * 100).toFixed(0)}% probability${scenario.valuationUsd ? `, ${usd(scenario.valuationUsd)}` : ""}`);
      lines.push(scenario.narrative);
      if (scenario.drivers.length) {
        lines.push("");
        lines.push(bullets(scenario.drivers));
      }
      lines.push("");
    });

    if (thesis.incompleteAnalysis.length) {
      lines.push("## Incomplete Analysis");
      lines.push("The following methodologies did not complete, and the conclusion above is drawn without them:");
      lines.push(bullets(thesis.incompleteAnalysis.map((item) => `${getMethodology(item.methodologyId)?.name ?? item.methodologyId}: ${item.reason}`)));
      lines.push("");
    }
  }

  return lines.join("\n");
}
