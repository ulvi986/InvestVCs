import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VacancyIn {
  id: string;
  startup_name: string;
  specialization: string;
  job_type: string;
  country: string;
  job_description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cv_text, skills, vacancies } = await req.json() as {
      cv_text?: string;
      skills?: string[];
      vacancies: VacancyIn[];
    };

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    if (!Array.isArray(vacancies) || vacancies.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Keep the payload small: cap the CV text and the number of roles considered.
    const cv = (cv_text || "").slice(0, 6000);
    const skillList = (skills || []).slice(0, 60).join(", ");
    const roles = vacancies.slice(0, 60).map((v) => ({
      id: v.id,
      startup: v.startup_name,
      role: v.specialization,
      type: v.job_type,
      country: v.country,
      description: (v.job_description || "").slice(0, 800),
    }));

    const systemPrompt = `You are an expert technical recruiter and career matcher. You are given a job seeker's CV text and/or skills, plus a list of open roles (each with an "id"). Rank how well the candidate fits each role.

Return ONLY valid JSON in this exact shape:
{
  "matches": [
    { "id": "<role id>", "score": 0-100, "reason": "one concise sentence on why it fits", "matched_skills": ["skill1", "skill2"] }
  ]
}

Rules:
- Score reflects genuine fit (skills, seniority, domain, location). Be honest — weak fits get low scores.
- Only include roles with score >= 20. Sort by score descending.
- "reason" must be specific to the candidate and role, max ~20 words, written in the same language as the CV/skills (default English).
- "matched_skills" lists the candidate's skills/keywords that actually appear relevant to that role (max 8).
- Use only the ids provided. Do not invent roles.`;

    const userPrompt = `Candidate skills: ${skillList || "(none provided)"}

Candidate CV text:
${cv || "(no CV text provided — rely on the skills list)"}

Open roles:
${JSON.stringify(roles, null, 2)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
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
      const tErr = await response.text();
      console.error("OpenAI API error:", response.status, tErr);
      return new Response(JSON.stringify({ error: "AI matching failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    let parsed: { matches?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { matches: [] };
    }

    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-jobs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
