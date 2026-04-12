import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuroraBackground from "@/components/AuroraBackground";

const ContactPage = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", surname: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.message) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: "u.sharifzade@gmail.com",
          subject: `Contact Form: ${form.name} ${form.surname}`,
          message: form.message,
          senderName: `${form.name} ${form.surname}`,
          senderEmail: form.email,
        },
      });
      if (error) throw error;
      toast.success(t("landing.contact_success"));
      setForm({ name: "", surname: "", email: "", message: "" });
    } catch {
      toast.error(t("landing.contact_error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <AuroraBackground />
      <Navbar />
      <main className="flex-1 relative z-10 flex items-center justify-center py-16">
        <div className="w-full max-w-lg mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-2">
            {t("landing.contact_title")}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {t("landing.contact_desc")}
          </p>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border/30 dark:border-white/10 bg-card/60 dark:bg-white/5 backdrop-blur-xl p-8 space-y-5 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">{t("landing.contact_name")}</Label>
                <Input id="c-name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-surname">{t("landing.contact_surname")}</Label>
                <Input id="c-surname" value={form.surname} onChange={(e) => setForm(p => ({ ...p, surname: e.target.value }))} required maxLength={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">{t("landing.contact_email")}</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-msg">{t("landing.contact_message")}</Label>
              <Textarea id="c-msg" value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} required maxLength={2000} rows={5} />
            </div>
            <Button type="submit" disabled={sending} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold border-0 h-11 rounded-xl shadow-lg">
              {sending ? t("landing.contact_sending") : t("landing.contact_send")}
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
