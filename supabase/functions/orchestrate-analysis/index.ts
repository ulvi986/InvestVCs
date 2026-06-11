// Multi-agent investment-analysis orchestrator built with LangChain.
//
// Instead of letting a single LLM answer alone, the work is split across
// specialised agents that run in sequence and feed each other:
//   1. Researcher  – surfaces the benchmarks & context needed to judge the data
//   2. Validator   – cross-checks the founder's numbers/claims against those
//                    benchmarks, flags unsupported / inconsistent claims and
//                    rates confidence (this is the "don't answer alone" step)
//   3. Analyst     – writes the investment analysis grounded ONLY in validated facts
//   4. Scorer      – produces the final structured verdict (score, risks, next steps)
//
// The orchestrator returns each stage plus a combined markdown report so the
// reasoning chain is transparent to the founder.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ChatOpenAI } from "npm:@langchain/openai@0.3.14";
import { SystemMessage, HumanMessage } from "npm:@langchain/core@0.3.18/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    if (!data) return json({ error: "Missing 'data' (startup metrics)" }, 400);

    const dataStr = JSON.stringify(data, null, 2);

    // Slightly different temperatures per role: factual agents stay cold,
    // the analyst is allowed a little more room to synthesise.
    const make = (temperature: number) =>
      new ChatOpenAI({ apiKey: OPENAI_API_KEY, model: "gpt-4o", temperature });

    const ask = async (temperature: number, system: string, human: string): Promise<string> => {
      const res = await make(temperature).invoke([
        new SystemMessage(system),
        new HumanMessage(human),
      ]);
      return typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    };

    // ── 1. Researcher ────────────────────────────────────────────────
    const research = await ask(
      0.2,
      `You are a venture research analyst. Given a startup's computed metrics, list the OBJECTIVE benchmarks and market context a serious investor would use to judge them (typical pre-seed/seed valuations for the stage, healthy runway, gross-margin and churn norms for the sector, TRL/CRL/FRL expectations). Output concise bullet points grouped by topic. Do NOT evaluate the startup yet — only provide the yardsticks. Never invent precise figures you are unsure of; say "rule of thumb" when approximate.`,
      `Startup metrics:\n\n${dataStr}`,
    );

    // ── 2. Validator (the "don't answer alone" cross-check) ──────────
    const validation = await ask(
      0,
      `You are a skeptical due-diligence validator. You are given (a) a startup's self-reported metrics and (b) research benchmarks. Cross-check the metrics against the benchmarks. Produce:
- **Validated facts**: claims that are internally consistent and benchmark-supported
- **Flagged claims**: numbers that look inconsistent, missing, implausible or unsupported, with WHY
- **Confidence**: overall data-quality confidence (low/medium/high) and what would raise it
Be specific and reference the actual numbers. Do not write the final investment analysis — only validate.`,
      `Startup metrics:\n\n${dataStr}\n\nResearch benchmarks:\n\n${research}`,
    );

    // ── 3. Analyst (grounded strictly in validated facts) ────────────
    const analysis = await ask(
      0.35,
      `You are a senior investment analyst. Write a clear investment-readiness analysis for the founder. Ground every claim ONLY in the validated facts; for anything the validator flagged, state the caveat instead of asserting it. Structure: Executive Summary, Valuation, Financial Health, Readiness (TRL/CRL/FRL), Key Risks, Action Plan. Reference real numbers. Respond in the language of the data labels (default English).`,
      `Startup metrics:\n\n${dataStr}\n\nValidator report:\n\n${validation}`,
    );

    // ── 4. Scorer (final structured verdict) ─────────────────────────
    const score = await ask(
      0,
      `You are the final investment committee scorer. Based on the analysis and validator report, output ONLY a compact markdown block with: an **Investor Readiness Score** (1-10) with one-line justification, the **Top 3 Risks**, and the **Top 3 Next Steps**. Penalise low data confidence.`,
      `Analysis:\n\n${analysis}\n\nValidator report:\n\n${validation}`,
    );

    const report = [
      analysis.trim(),
      "\n\n---\n\n## Verdict\n",
      score.trim(),
      "\n\n---\n\n## Data validation\n",
      validation.trim(),
    ].join("\n");

    return json({ report, stages: { research, validation, analysis, score } });
  } catch (e) {
    console.error("orchestrate-analysis error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
