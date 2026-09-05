// Multi-agent investment-analysis orchestrator.
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

// Build the Azure OpenAI (or OpenAI-compatible proxy) chat completions URL.
// - Direct Azure:  AZURE_OPENAI_ENDPOINT = https://<resource>.openai.azure.com
//   -> https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=<version>
// - Proxy:         AZURE_OPENAI_ENDPOINT = https://<proxy>/v1/chat/completions (used as-is)
const buildChatUrl = (endpoint: string, deployment: string, apiVersion: string) => {
  const base = endpoint.replace(/\/+$/, "");
  if (base.includes("/chat/completions")) return base;
  return `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
};

// Azure authenticates with the `api-key` header; OpenAI-compatible proxies use
// `Authorization: Bearer`. If no key is set (proxy handles auth), no header is sent.
const buildHeaders = (endpoint: string, apiKey: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!apiKey) return headers;
  if (endpoint.includes("openai.azure.com")) {
    headers["api-key"] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data } = await req.json();
    const AI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    if (!AI_ENDPOINT) throw new Error("AZURE_OPENAI_ENDPOINT is not configured");
    const AI_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-4o";
    const AI_API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-10-21";
    const AI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "";
    if (!data) return json({ error: "Missing 'data' (startup metrics)" }, 400);

    const chatUrl = buildChatUrl(AI_ENDPOINT, AI_DEPLOYMENT, AI_API_VERSION);
    const chatHeaders = buildHeaders(AI_ENDPOINT, AI_API_KEY);
    const dataStr = JSON.stringify(data, null, 2);

    // Slightly different temperatures per role: factual agents stay cold,
    // the analyst is allowed a little more room to synthesise.
    const ask = async (temperature: number, system: string, human: string): Promise<string> => {
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          model: AI_DEPLOYMENT,
          temperature,
          messages: [
            { role: "system", content: system },
            { role: "user", content: human },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("AI API error:", res.status, text);
        throw new Error(`AI API request failed with status ${res.status}`);
      }

      const result = await res.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty AI response");
      return typeof content === "string" ? content : JSON.stringify(content);
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
