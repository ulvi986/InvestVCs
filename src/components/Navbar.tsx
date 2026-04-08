import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Globe, ChevronDown, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage, Language } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImg from "@/assets/logo.jpeg";

const langLabels: Record<Language, string> = {
  en: "EN",
  tr: "TR",
  az: "AZ",
};

const langFull: Record<Language, string> = {
  en: "English",
  tr: "Türkçe",
  az: "Azərbaycan",
};

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isInvestor, isInvestorPending } = useUserRole();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInvestorUser = isInvestor || isInvestorPending;

  const links = user
    ? [
        ...(isAdmin ? [{ to: "/admin", label: t("nav.admin") }] : []),
        ...(isInvestorUser
          ? [
              ...(isInvestor
                ? [
                    { to: "/investor", label: t("nav.investor_dashboard") },
                    { to: "/vacancies", label: t("nav.vacancies") },
                  ]
                : []),
              { to: "/profile", label: t("nav.profile") },
            ]
          : []),
        ...(!isInvestorUser
          ? [
              { to: "/summary", label: t("nav.summary") },
              { to: "/evaluation", label: t("nav.evaluation") },
              { to: "/preparation", label: t("nav.financial") },
              { to: "/readiness", label: t("nav.readiness") },
              { to: "/venture-analysis", label: t("nav.venture_analysis") },
              { to: "/vacancies", label: t("nav.vacancies") },
              { to: "/profile", label: t("nav.profile") },
            ]
          : []),
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/10 dark:border-white/5 bg-card/60 dark:bg-slate-900/60 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-bold hover:opacity-80 transition-opacity">
          <img src={logoImg} alt="InvestVCs" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">InvestVCs</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                location.pathname === link.to
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {location.pathname === link.to && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-9 rounded-lg">
                <Globe className="h-4 w-4" />
                {langLabels[language]}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(langLabels) as Language[]).map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? "bg-primary/10 text-primary" : ""}
                >
                  {langFull[lang]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title={t("nav.signout")} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="ghost" size="sm" className="rounded-lg">{t("nav.signin")}</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground border-0 rounded-lg font-semibold">
                  {t("nav.signup")}
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <button className="text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/10 bg-card/90 dark:bg-slate-900/95 backdrop-blur-xl p-4 lg:hidden animate-in slide-in-from-top-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex gap-2 mt-3 px-4">
            {(Object.keys(langLabels) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  language === lang
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {langFull[lang]}
              </button>
            ))}
          </div>

          {user ? (
            <Button variant="ghost" className="mt-3 w-full text-destructive" onClick={() => { signOut(); setMobileOpen(false); }}>
              {t("nav.signout")}
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <Link to="/signin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">{t("nav.signin")}</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-accent text-accent-foreground border-0">{t("nav.signup")}</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
