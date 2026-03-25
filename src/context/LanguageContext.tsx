import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "tr" | "az";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    "nav.admin": "🛡️ Admin Panel",
    "nav.investor_dashboard": "📈 Investor Dashboard",
    "nav.vacancies": "💼 Vacancies",
    "nav.profile": "👤 Profile",
    "nav.evaluation": "Startup Evaluation",
    "nav.financial": "Financial Management",
    "nav.readiness": "Readiness Level",
    "nav.summary": "📊 Overall Summary",
    "nav.signin": "Sign In",
    "nav.signup": "Get Started",
    "nav.signout": "Sign Out",

    // Profile
    "profile.title": "Profile",
    "profile.investor_title": "Investor Profile",
    "profile.personal_info": "Personal Information",
    "profile.first_name": "First Name",
    "profile.last_name": "Last Name",
    "profile.email": "Email",
    "profile.country": "Country",
    "profile.joined": "Joined",
    "profile.save": "Save Changes",
    "profile.saving": "Saving...",
    "profile.startup_info": "Startup Information",
    "profile.startup_name": "Startup Name",
    "profile.industry": "Industry",
    "profile.about": "About Startup",
    "profile.status": "Status",
    "profile.approved": "Approved",
    "profile.pending": "Pending Approval",
    "profile.financial_overview": "Financial Overview",

    // Auth
    "auth.signin": "Sign In",
    "auth.signup": "Sign Up",
    "auth.signin_desc": "Sign in to your account",
    "auth.signup_desc": "Start evaluating your startup",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.no_account": "Don't have an account?",
    "auth.have_account": "Already have an account?",
    "auth.investor_q": "Are you an investor?",
    "auth.startup_q": "Are you a startup?",
    "auth.investor_reg": "Investor Registration",
    "auth.investor_signup": "Investor Sign Up",
    "auth.investor_signup_desc": "Apply for investor access. Admin approval required.",
    "auth.apply_investor": "Apply as Investor",

    // Investor Dashboard
    "investor.title": "Investor Dashboard",
    "investor.desc": "Browse all startups and their complete evaluation summary.",
    "investor.search": "Search startups, country, industry...",
    "investor.no_startups": "No startups found.",
    "investor.loading": "Loading...",
    "investor.pending_title": "Pending Approval",
    "investor.pending_desc": "Your investor application is under review. An admin will approve your access shortly.",
    "investor.denied_title": "Access Denied",
    "investor.denied_desc": "You don't have investor privileges.",
    "investor.weighted_avg": "Weighted Avg Valuation",
    "investor.joined": "Joined",
    "investor.preseed_methods": "Pre-Seed Valuation Methods",
    "investor.berkus": "Berkus Method",
    "investor.scorecard": "Scorecard Method",
    "investor.risk_factor": "Risk Factor Method",
    "investor.weighted_avg_val": "Weighted Average Valuation",
    "investor.based_on": "Based on",
    "investor.methods": "method(s)",
    "investor.readiness": "Readiness Levels",
    "investor.trl": "Technology (TRL)",
    "investor.crl": "Commercial (CRL)",
    "investor.frl": "Financial (FRL)",
    "investor.completed": "Completed",
    "investor.advanced": "Advanced",
    "investor.in_progress": "In Progress",
    "investor.not_started": "Not Started",

    // Vacancies
    "vacancies.title": "Startup Vacancies",
    "vacancies.add": "Add Vacancy",
    "vacancies.edit": "Edit",
    "vacancies.delete": "Delete",
    "vacancies.startup_name": "Startup Name",
    "vacancies.country": "Country",
    "vacancies.job_type": "Job Type",
    "vacancies.specialization": "Specialization",
    "vacancies.job_desc": "Job Description",
    "vacancies.startup_desc": "Startup Description",
    "vacancies.contact_email": "Contact Email",
    "vacancies.approved": "Approved",
    "vacancies.pending": "Pending",

    // Evaluation
    "eval.title": "Startup Evaluation",
    "eval.preseed": "Pre-Seed Stage",
    "eval.seed": "Seed Stage",

    // Financial
    "financial.title": "Financial Management",

    // Readiness
    "readiness.title": "Readiness Level",

    // Summary
    "summary.title": "Overall Summary",

    // Landing
    "landing.hero_title": "Know Your Startup's",
    "landing.hero_highlight": "True Value",
    "landing.hero_sub": "Before Investors Do",
    "landing.hero_desc": "Stop guessing. Use the same valuation frameworks VCs use — Berkus, Scorecard, Risk Factor, VC Method & First Chicago — to calculate, track, and present your startup's worth with confidence.",
    "landing.go_dashboard": "Go to Dashboard",
    "landing.get_started": "Get Started — Free",
    "landing.features_title": "Everything You Need to",
    "landing.features_highlight": "Evaluate & Prepare",
    "landing.features_desc": "Three powerful modules designed to take your startup from idea to investor-ready.",
    "landing.how_title": "How It Works",
    "landing.how_desc": "Four simple steps to data-driven startup valuation.",
    "landing.cta_title": "Ready to Know What You're Worth?",
    "landing.cta_desc": "Join founders who use data — not guesswork — to negotiate with investors.",
    "landing.cta_btn": "Start Free Evaluation",
    "landing.explore": "Explore",
    "landing.badge": "Built for Founders & Developers",
    "landing.signin": "Sign In",
    "landing.stat_valuation": "Valuation Methods",
    "landing.stat_metrics": "Financial Metrics",
    "landing.stat_readiness": "Readiness Levels",
    "landing.stat_snapshots": "Snapshots",
    "landing.feature1_title": "Pre-Seed & Seed Valuation",
    "landing.feature1_desc": "Berkus, Scorecard, Risk Factor, VC Method, and First Chicago — all in one place with instant results.",
    "landing.feature2_title": "Financial Management",
    "landing.feature2_desc": "Track revenue, expenses, burn rate, runway, CLTV, and more with monthly snapshots and dashboards.",
    "landing.feature3_title": "Readiness Assessment",
    "landing.feature3_desc": "Measure your TRL, CRL, and FRL levels to understand exactly where your startup stands.",
    "landing.step1_title": "Sign Up",
    "landing.step1_desc": "Create your free account in seconds.",
    "landing.step2_title": "Input Your Data",
    "landing.step2_desc": "Fill in valuation methods, financials, and readiness checks.",
    "landing.step3_title": "Get Insights",
    "landing.step3_desc": "Receive instant valuations, charts, and strategic advice.",
    "landing.step4_title": "Pitch with Confidence",
    "landing.step4_desc": "Use data-backed valuations in investor conversations.",

    // Ethical Agreement
    "auth.ethical_agreement": "I agree to the Ethical Agreement",
    "auth.ethical_title": "Ethical Agreement",
    "auth.ethical_text": "By registering, I confirm that I will use this platform ethically and responsibly. I agree not to misuse any data, valuations, or information provided. I will respect the confidentiality of startup information and act in good faith in all interactions on this platform.",
    "auth.ethical_required": "You must accept the Ethical Agreement",

    // Investor financial
    "investor.financial": "Financial Overview",
    "investor.revenue": "Revenue",
    "investor.expenses": "Expenses",
    "investor.burn_rate": "Burn Rate",
    "investor.runway": "Runway",
    "investor.no_financial": "No financial data available",
    "investor.months": "months",

    // Common
    "common.loading": "Loading...",
    "common.language": "Language",
  },
  tr: {
    // Navbar
    "nav.admin": "🛡️ Yönetim Paneli",
    "nav.investor_dashboard": "📈 Yatırımcı Paneli",
    "nav.vacancies": "💼 İş İlanları",
    "nav.profile": "👤 Profil",
    "nav.evaluation": "Girişim Değerlendirmesi",
    "nav.financial": "Finansal Yönetim",
    "nav.readiness": "Hazırlık Seviyesi",
    "nav.summary": "📊 Genel Özet",
    "nav.signin": "Giriş Yap",
    "nav.signup": "Başla",
    "nav.signout": "Çıkış",

    // Profile
    "profile.title": "Profil",
    "profile.investor_title": "Yatırımcı Profili",
    "profile.personal_info": "Kişisel Bilgiler",
    "profile.first_name": "Ad",
    "profile.last_name": "Soyad",
    "profile.email": "E-posta",
    "profile.country": "Ülke",
    "profile.joined": "Katılım",
    "profile.save": "Değişiklikleri Kaydet",
    "profile.saving": "Kaydediliyor...",
    "profile.startup_info": "Girişim Bilgileri",
    "profile.startup_name": "Girişim Adı",
    "profile.industry": "Sektör",
    "profile.about": "Girişim Hakkında",
    "profile.status": "Durum",
    "profile.approved": "Onaylandı",
    "profile.pending": "Onay Bekleniyor",
    "profile.financial_overview": "Finansal Genel Bakış",

    // Auth
    "auth.signin": "Giriş Yap",
    "auth.signup": "Kayıt Ol",
    "auth.signin_desc": "Hesabınıza giriş yapın",
    "auth.signup_desc": "Girişiminizi değerlendirmeye başlayın",
    "auth.email": "E-posta",
    "auth.password": "Şifre",
    "auth.no_account": "Hesabınız yok mu?",
    "auth.have_account": "Zaten hesabınız var mı?",
    "auth.investor_q": "Yatırımcı mısınız?",
    "auth.startup_q": "Bir girişim misiniz?",
    "auth.investor_reg": "Yatırımcı Kaydı",
    "auth.investor_signup": "Yatırımcı Kaydı",
    "auth.investor_signup_desc": "Yatırımcı erişimi için başvurun. Yönetici onayı gereklidir.",
    "auth.apply_investor": "Yatırımcı Olarak Başvur",

    // Investor Dashboard
    "investor.title": "Yatırımcı Paneli",
    "investor.desc": "Tüm girişimleri ve değerlendirme özetlerini görüntüleyin.",
    "investor.search": "Girişim, ülke, sektör ara...",
    "investor.no_startups": "Girişim bulunamadı.",
    "investor.loading": "Yükleniyor...",
    "investor.pending_title": "Onay Bekleniyor",
    "investor.pending_desc": "Yatırımcı başvurunuz inceleniyor. Bir yönetici kısa süre içinde erişiminizi onaylayacaktır.",
    "investor.denied_title": "Erişim Engellendi",
    "investor.denied_desc": "Yatırımcı yetkiniz bulunmamaktadır.",
    "investor.weighted_avg": "Ağırlıklı Ort. Değerleme",
    "investor.joined": "Katılım",
    "investor.preseed_methods": "Ön Tohum Değerleme Yöntemleri",
    "investor.berkus": "Berkus Yöntemi",
    "investor.scorecard": "Puan Kartı Yöntemi",
    "investor.risk_factor": "Risk Faktörü Yöntemi",
    "investor.weighted_avg_val": "Ağırlıklı Ortalama Değerleme",
    "investor.based_on": "Dayalı",
    "investor.methods": "yöntem",
    "investor.readiness": "Hazırlık Seviyeleri",
    "investor.trl": "Teknoloji (TRL)",
    "investor.crl": "Ticari (CRL)",
    "investor.frl": "Finansal (FRL)",
    "investor.completed": "Tamamlandı",
    "investor.advanced": "İleri Düzey",
    "investor.in_progress": "Devam Ediyor",
    "investor.not_started": "Başlamadı",

    // Vacancies
    "vacancies.title": "Girişim İş İlanları",
    "vacancies.add": "İlan Ekle",
    "vacancies.edit": "Düzenle",
    "vacancies.delete": "Sil",
    "vacancies.startup_name": "Girişim Adı",
    "vacancies.country": "Ülke",
    "vacancies.job_type": "İş Türü",
    "vacancies.specialization": "Uzmanlık",
    "vacancies.job_desc": "İş Açıklaması",
    "vacancies.startup_desc": "Girişim Açıklaması",
    "vacancies.contact_email": "İletişim E-postası",
    "vacancies.approved": "Onaylandı",
    "vacancies.pending": "Beklemede",

    // Evaluation
    "eval.title": "Girişim Değerlendirmesi",
    "eval.preseed": "Ön Tohum Aşaması",
    "eval.seed": "Tohum Aşaması",

    // Financial
    "financial.title": "Finansal Yönetim",

    // Readiness
    "readiness.title": "Hazırlık Seviyesi",

    // Summary
    "summary.title": "Genel Özet",

    // Landing
    "landing.hero_title": "Girişiminizin",
    "landing.hero_highlight": "Gerçek Değerini",
    "landing.hero_sub": "Yatırımcılardan Önce Bilin",
    "landing.hero_desc": "Tahmin etmeyi bırakın. VC'lerin kullandığı değerleme çerçevelerini kullanın — Berkus, Puan Kartı, Risk Faktörü, VC Yöntemi ve First Chicago — girişiminizin değerini güvenle hesaplayın.",
    "landing.go_dashboard": "Panele Git",
    "landing.get_started": "Ücretsiz Başla",
    "landing.features_title": "İhtiyacınız Olan Her Şey",
    "landing.features_highlight": "Değerlendirin ve Hazırlanın",
    "landing.features_desc": "Girişiminizi fikirden yatırımcıya hazır hale getirmek için tasarlanmış üç güçlü modül.",
    "landing.how_title": "Nasıl Çalışır",
    "landing.how_desc": "Veri odaklı girişim değerlemesi için dört basit adım.",
    "landing.cta_title": "Değerinizi Bilmeye Hazır mısınız?",
    "landing.cta_desc": "Yatırımcılarla müzakere etmek için tahmin değil veri kullanan girişimcilere katılın.",
    "landing.cta_btn": "Ücretsiz Değerlendirme Başlat",
    "landing.explore": "Keşfet",

    // Common
    "common.loading": "Yükleniyor...",
    "common.language": "Dil",
  },
  az: {
    // Navbar
    "nav.admin": "🛡️ Admin Panel",
    "nav.investor_dashboard": "📈 İnvestor Paneli",
    "nav.vacancies": "💼 Vakansiyalar",
    "nav.profile": "👤 Profil",
    "nav.evaluation": "Startap Qiymətləndirmə",
    "nav.financial": "Maliyyə İdarəetməsi",
    "nav.readiness": "Hazırlıq Səviyyəsi",
    "nav.summary": "📊 Ümumi Xülasə",
    "nav.signin": "Daxil ol",
    "nav.signup": "Başla",
    "nav.signout": "Çıxış",

    // Profile
    "profile.title": "Profil",
    "profile.investor_title": "İnvestor Profili",
    "profile.personal_info": "Şəxsi Məlumatlar",
    "profile.first_name": "Ad",
    "profile.last_name": "Soyad",
    "profile.email": "E-poçt",
    "profile.country": "Ölkə",
    "profile.joined": "Qoşulma",
    "profile.save": "Dəyişiklikləri Saxla",
    "profile.saving": "Saxlanılır...",
    "profile.startup_info": "Startap Məlumatları",
    "profile.startup_name": "Startap Adı",
    "profile.industry": "Sahə",
    "profile.about": "Startap Haqqında",
    "profile.status": "Status",
    "profile.approved": "Təsdiqlənib",
    "profile.pending": "Təsdiq Gözlənilir",
    "profile.financial_overview": "Maliyyə İcmalı",

    // Auth
    "auth.signin": "Daxil ol",
    "auth.signup": "Qeydiyyat",
    "auth.signin_desc": "Hesabınıza daxil olun",
    "auth.signup_desc": "Startapınızı qiymətləndirməyə başlayın",
    "auth.email": "E-poçt",
    "auth.password": "Şifrə",
    "auth.no_account": "Hesabınız yoxdur?",
    "auth.have_account": "Artıq hesabınız var?",
    "auth.investor_q": "İnvestorsunuz?",
    "auth.startup_q": "Startapsınız?",
    "auth.investor_reg": "İnvestor Qeydiyyatı",
    "auth.investor_signup": "İnvestor Qeydiyyatı",
    "auth.investor_signup_desc": "İnvestor girişi üçün müraciət edin. Admin təsdiqi tələb olunur.",
    "auth.apply_investor": "İnvestor Olaraq Müraciət Et",

    // Investor Dashboard
    "investor.title": "İnvestor Paneli",
    "investor.desc": "Bütün startapları və onların qiymətləndirmə xülasələrini nəzərdən keçirin.",
    "investor.search": "Startap, ölkə, sahə axtar...",
    "investor.no_startups": "Startap tapılmadı.",
    "investor.loading": "Yüklənir...",
    "investor.pending_title": "Təsdiq Gözlənilir",
    "investor.pending_desc": "İnvestor müraciətiniz nəzərdən keçirilir. Admin qısa müddətdə girişinizi təsdiqləyəcək.",
    "investor.denied_title": "Giriş Rədd Edildi",
    "investor.denied_desc": "İnvestor səlahiyyətiniz yoxdur.",
    "investor.weighted_avg": "Çəkili Ort. Qiymət",
    "investor.joined": "Qoşulub",
    "investor.preseed_methods": "Pre-Seed Qiymətləndirmə Metodları",
    "investor.berkus": "Berkus Metodu",
    "investor.scorecard": "Scorecard Metodu",
    "investor.risk_factor": "Risk Faktoru Metodu",
    "investor.weighted_avg_val": "Çəkili Ortalama Qiymətləndirmə",
    "investor.based_on": "Əsasında",
    "investor.methods": "metod",
    "investor.readiness": "Hazırlıq Səviyyələri",
    "investor.trl": "Texnologiya (TRL)",
    "investor.crl": "Kommersiya (CRL)",
    "investor.frl": "Maliyyə (FRL)",
    "investor.completed": "Tamamlanıb",
    "investor.advanced": "İrəli Səviyyə",
    "investor.in_progress": "Davam Edir",
    "investor.not_started": "Başlanmayıb",

    // Vacancies
    "vacancies.title": "Startap Vakansiyaları",
    "vacancies.add": "Vakansiya Əlavə Et",
    "vacancies.edit": "Redaktə",
    "vacancies.delete": "Sil",
    "vacancies.startup_name": "Startap Adı",
    "vacancies.country": "Ölkə",
    "vacancies.job_type": "İş Növü",
    "vacancies.specialization": "İxtisas",
    "vacancies.job_desc": "İş Təsviri",
    "vacancies.startup_desc": "Startap Təsviri",
    "vacancies.contact_email": "Əlaqə E-poçtu",
    "vacancies.approved": "Təsdiqlənib",
    "vacancies.pending": "Gözləmədə",

    // Evaluation
    "eval.title": "Startap Qiymətləndirmə",
    "eval.preseed": "Pre-Seed Mərhələ",
    "eval.seed": "Seed Mərhələ",

    // Financial
    "financial.title": "Maliyyə İdarəetməsi",

    // Readiness
    "readiness.title": "Hazırlıq Səviyyəsi",

    // Summary
    "summary.title": "Ümumi Xülasə",

    // Landing
    "landing.hero_title": "Startapınızın",
    "landing.hero_highlight": "Əsl Dəyərini",
    "landing.hero_sub": "İnvestorlardan Əvvəl Bilin",
    "landing.hero_desc": "Təxmin etməyi dayandırın. VC-lərin istifadə etdiyi qiymətləndirmə çərçivələrini istifadə edin — Berkus, Scorecard, Risk Faktoru, VC Metodu və First Chicago — startapınızın dəyərini inamla hesablayın.",
    "landing.go_dashboard": "Panelə Keç",
    "landing.get_started": "Pulsuz Başla",
    "landing.features_title": "Ehtiyacınız Olan Hər Şey",
    "landing.features_highlight": "Qiymətləndirin və Hazırlaşın",
    "landing.features_desc": "Startapınızı ideyadan investora hazır hala gətirmək üçün nəzərdə tutulmuş üç güclü modul.",
    "landing.how_title": "Necə İşləyir",
    "landing.how_desc": "Məlumata əsaslanan startap qiymətləndirməsi üçün dörd sadə addım.",
    "landing.cta_title": "Dəyərinizi Bilməyə Hazırsınız?",
    "landing.cta_desc": "İnvestorlarla danışıqlar aparmaq üçün təxmin deyil, məlumat istifadə edən qurucuculara qoşulun.",
    "landing.cta_btn": "Pulsuz Qiymətləndirməyə Başla",
    "landing.explore": "Kəşf Et",

    // Common
    "common.loading": "Yüklənir...",
    "common.language": "Dil",
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
