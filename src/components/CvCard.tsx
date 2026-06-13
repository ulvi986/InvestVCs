import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "@/components/ui/sonner";
import { Upload, FileText, Loader2 } from "lucide-react";

// Extract plain text from a .docx (Word) or .txt file. Other formats (e.g. PDF)
// are still uploaded; the AI matcher just relies on the skills list instead.
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

/** CV upload + display for job seekers. Stores the file in the private `cvs`
 *  bucket and metadata in `user_cvs`, which the AI Job Search reuses. */
const CvCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_cvs").select("file_name").eq("user_id", user.id).maybeSingle();
      if (data?.file_name) setFileName(data.file_name);
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
      const skills = tokenize(text);
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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{t("profile.cv")}</label>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-muted/30 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="truncate text-sm text-muted-foreground">{fileName || t("jobmatch.no_cv")}</p>
        </div>
        <label className="shrink-0">
          <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {fileName ? t("jobmatch.replace") : t("jobmatch.upload")}
          </span>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t("jobmatch.formats")}</p>
    </div>
  );
};

export default CvCard;
