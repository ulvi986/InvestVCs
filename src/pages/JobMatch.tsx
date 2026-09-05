import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Upload, FileText, Loader2, Sparkles, MapPin, Send, CheckCircle2, Check } from "lucide-react";
import { gmailComposeUrl } from "@/lib/contact";

interface Vacancy {
  id: string; user_id: string; startup_name: string; country: string; job_type: string;
  job_description: string; specialization: string; contact_email: string; approved: boolean;
}

type Match = { v: Vacancy; score: number; matched: string[]; reason?: string };

// Extract plain text from a .docx (Word) or .txt file. Other formats (e.g. PDF)
// are still uploaded, but the user supplies skills manually.
async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return file.text();
  if (name.endsWith(".docx")) {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const xml = await zip.file("word/document.xml")?.async("text");
      if (!xml) return "";
      return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } catch { return ""; }
  }
  return "";
}

const tokenize = (s: string): string[] =>
  Array.from(new Set(
    s.toLowerCase().split(/[,\n;/|]+/).map((x) => x.trim()).filter((x) => x.length > 1)
  ));

const JobMatch = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [skillsText, setSkillsText] = useState("");
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [{ data: vac }, { data: cv }, { data: apps }] = await Promise.all([
        supabase.from("startup_vacancies").select("*").eq("approved", true),
        (supabase as any).from("user_cvs").select("*").eq("user_id", user?.id).maybeSingle(),
        (supabase as any).from("job_applications").select("vacancy_id").eq("user_id", user?.id),
      ]);
      setVacancies((vac as any[]) ?? []);
      setApplied(new Set(((apps as any[]) ?? []).map((a) => a.vacancy_id)));
      if (cv) {
        setFileName((cv as any).file_name || null);
        if ((cv as any).extracted_text) setCvText((cv as any).extracted_text);
        const skills = (cv as any).skills as string[] | null;
        if (skills?.length) setSkillsText(skills.join(", "));
        else if ((cv as any).extracted_text) setSkillsText((cv as any).extracted_text.slice(0, 1500));
      }
    })();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error(t("jobmatch.too_large")); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const text = await extractText(file);
      if (text) setCvText(text);
      if (text && !skillsText.trim()) setSkillsText(text.slice(0, 1500));

      const skills = tokenize(skillsText || text);
      await (supabase as any).from("user_cvs").upsert({
        user_id: user.id,
        file_path: path,
        file_name: file.name,
        extracted_text: text || null,
        skills,
        updated_at: new Date().toISOString(),
      });
      setFileName(file.name);
      toast.success(t("jobmatch.uploaded"));
    } catch (err: any) {
      toast.error(err?.message || t("jobmatch.upload_error"));
    } finally {
      setUploading(false);
    }
  };

  // Local keyword fallback used if the AI matcher is unavailable.
  const keywordMatch = (tokens: string[]): Match[] =>
    vacancies
      .map((v) => {
        const hay = `${v.specialization} ${v.job_type} ${v.job_description} ${v.startup_name} ${v.country}`.toLowerCase();
        const matched = tokens.filter((tk) => hay.includes(tk));
        const score = Math.round((matched.length / tokens.length) * 100);
        return { v, score, matched };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

  const runMatch = async () => {
    const tokens = tokenize(skillsText);
    if (tokens.length === 0 && !cvText.trim()) { toast.error(t("jobmatch.add_skills")); return; }
    if (vacancies.length === 0) { setMatches([]); return; }

    // persist the refined skills for later
    if (user && tokens.length) {
      await (supabase as any).from("user_cvs")
        .update({ skills: tokens, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    setMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-jobs", {
        body: {
          cv_text: cvText,
          skills: tokens,
          vacancies: vacancies.map((v) => ({
            id: v.id,
            startup_name: v.startup_name,
            specialization: v.specialization,
            job_type: v.job_type,
            country: v.country,
            job_description: v.job_description,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const byId = new Map(vacancies.map((v) => [v.id, v]));
      const aiMatches: Match[] = ((data?.matches as any[]) ?? [])
        .map((m) => {
          const v = byId.get(m.id);
          if (!v) return null;
          return {
            v,
            score: Math.max(0, Math.min(100, Math.round(Number(m.score) || 0))),
            matched: Array.isArray(m.matched_skills) ? m.matched_skills.slice(0, 8) : [],
            reason: typeof m.reason === "string" ? m.reason : undefined,
          } as Match;
        })
        .filter((m): m is Match => m !== null)
        .sort((a, b) => b.score - a.score);

      // If AI returned nothing usable, fall back to keyword scoring.
      setMatches(aiMatches.length ? aiMatches : keywordMatch(tokens));
    } catch (err) {
      console.error("AI match failed, falling back to keyword match:", err);
      setMatches(keywordMatch(tokens));
    } finally {
      setMatching(false);
    }
  };

  const apply = async (v: Vacancy) => {
    if (!user) return;
    if (!applied.has(v.id)) {
      setApplied((prev) => new Set(prev).add(v.id));
      const { error } = await (supabase as any)
        .from("job_applications")
        .insert({ user_id: user.id, vacancy_id: v.id });
      if (error && !String(error.message).includes("duplicate")) {
        setApplied((prev) => { const n = new Set(prev); n.delete(v.id); return n; });
        toast.error(t("jobmatch.apply_error"));
        return;
      }
      toast.success(t("jobmatch.applied"));
    }
    if (v.contact_email) window.open(gmailComposeUrl(v.contact_email, `Application: ${v.specialization}`), "_blank");
  };

  const scoreColor = (s: number) => (s >= 60 ? "var(--positive)" : s >= 30 ? "var(--accent-ink)" : "var(--negative)");

  return (
    <DashboardLayout title={t("jobmatch.ai_title")} subtitle={t("jobmatch.ai_subtitle")}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Upload + skills */}
        <div className="rounded-3xl border border-[var(--rule)] bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(132,125,255,0.14)" }}>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink-1)]">{fileName || t("jobmatch.no_cv")}</p>
                <p className="text-xs text-[var(--ink-3)]">{t("jobmatch.formats")}</p>
              </div>
            </div>
            <label className="shrink-0">
              <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--rule)] bg-[var(--band)] px-4 py-2 text-sm text-[var(--ink-1)] transition-colors hover:bg-[var(--band)]">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {fileName ? t("jobmatch.replace") : t("jobmatch.upload")}
              </span>
            </label>
          </div>

          <div className="mt-5 space-y-2">
            <Label>{t("jobmatch.skills_label")}</Label>
            <Textarea
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder={t("jobmatch.skills_placeholder")}
              rows={3}
              className="resize-none border-[var(--rule)] bg-[var(--band)]"
            />
            <p className="text-xs text-[var(--ink-3)]">{t("jobmatch.skills_hint")}</p>
          </div>

          <Button onClick={runMatch} disabled={matching} className="mt-4 gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 font-semibold">
            {matching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {matching ? t("jobmatch.matching") : t("jobmatch.find")}
          </Button>
        </div>

        {/* Results */}
        {matches && (
          matches.length === 0 ? (
            <div className="rounded-3xl border border-[var(--rule)] bg-card p-10 text-center">
              <p className="text-[var(--ink-2)]">{t("jobmatch.no_matches")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-2)]">{matches.length} {t("jobmatch.matches_found")}</p>
              {matches.map(({ v, score, matched, reason }) => (
                <div key={v.id} className="rounded-2xl border border-[var(--rule)] bg-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2" style={{ borderColor: scoreColor(score) }}>
                      <span className="font-origin-display text-lg font-medium" style={{ color: scoreColor(score) }}>{score}%</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-[var(--ink-1)]">{v.specialization}</h3>
                        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">{v.job_type}</span>
                      </div>
                      <p className="text-sm text-[var(--ink-2)]">{v.startup_name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--ink-3)]"><MapPin className="h-3.5 w-3.5" /> {v.country}</p>
                      {reason && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {reason}
                        </p>
                      )}
                      {matched.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {matched.slice(0, 8).map((m) => (
                            <span key={m} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                              <CheckCircle2 className="h-3 w-3" /> {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => apply(v)}
                      disabled={applied.has(v.id)}
                      className={`h-8 shrink-0 gap-1.5 border-0 ${applied.has(v.id) ? "bg-green-600/80 text-[var(--ink-1)]" : "gradient-primary text-primary-foreground"}`}
                    >
                      {applied.has(v.id) ? <><Check className="h-3.5 w-3.5" /> {t("jobmatch.applied_label")}</> : <><Send className="h-3.5 w-3.5" /> {t("jobmatch.apply")}</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobMatch;
