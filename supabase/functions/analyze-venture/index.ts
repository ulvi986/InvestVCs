import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "bmc") {
      systemPrompt = `You are an expert startup business consultant and venture analyst. Analyze the Business Model Canvas provided and give detailed, actionable feedback. Structure your response with:
1. **Overall Assessment** - A brief summary of the business model strength
2. **Strengths** - What's working well in the canvas
3. **Weaknesses** - Areas that need improvement
4. **Opportunities** - Potential growth areas
5. **Threats** - Risks to watch out for
6. **Recommendations** - Specific, actionable suggestions for each block
7. **Score** - Give an overall score from 1-10

Be specific, constructive, and reference the actual content provided. Respond in the same language as the canvas content.`;

      userPrompt = `Please analyze this Business Model Canvas:\n\n${JSON.stringify(data, null, 2)}`;
    } else if (type === "pitch_deck") {
      systemPrompt = `You are an expert venture capital analyst and pitch deck consultant. Analyze the pitch deck content provided and give detailed feedback. Structure your response with:
1. **Overall Impression** - First impression and key takeaway
2. **Story & Narrative** - How well the deck tells a compelling story
3. **Problem-Solution Fit** - How clearly the problem and solution are presented
4. **Market Analysis** - Quality of market sizing and competitive analysis
5. **Business Model** - Clarity and viability of the business model
6. **Team** - Team presentation quality
7. **Financial Projections** - Realism and completeness of financials
8. **Ask & Use of Funds** - Clarity of the investment ask
9. **Design & Flow** - Visual quality and slide flow
10. **Recommendations** - Specific improvements for each slide
11. **Score** - Give an overall score from 1-10

Be specific, constructive, and reference actual slide content. Respond in the same language as the deck content.`;

      userPrompt = `Please analyze this pitch deck content:\n\n${data}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid analysis type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(JSON.stringify({ error: "OpenAI API key issue. Check your API key and billing." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "No analysis generated.";

    return new Response(JSON.stringify({ analysis: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-venture error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
