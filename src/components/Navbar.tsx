import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Globe, ChevronDown, Sun, Moon, Sparkles } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [open, setOpen] = useState(false);

  const isInvestorUser = isInvestor || isInvestorPending;

  const links = user
    ? [
        ...(isAdmin ? [{ to: "/admin", label: t("nav.admin") }] : []),
        ...(isInvestorUser
          ? [
              ...(isInvestor
                ? [
                    { to: "/investor", label: t("nav.investor_dashboard") },
                    { to: "/funding-view", label: t("nav.funding_view") },
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

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
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

          {user && (
            <Link to="/pricing" className="hidden sm:block">
              <Button
                size="sm"
                className="gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 font-semibold shadow-sm hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            </Link>
          )}

          {!user && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link to="/signin">
                <Button variant="ghost" size="sm" className="rounded-lg">{t("nav.signin")}</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground border-0 rounded-lg font-semibold">
                  {t("nav.signup")}
                </Button>
              </Link>
            </div>
          )}

          {/* Hamburger menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border-border/20 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-border/20">
                  <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                    <img src={logoImg} alt="InvestVCs" className="h-8 w-8 rounded-xl object-cover" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-display font-bold text-lg">InvestVCs</span>
                  </Link>
                </div>

                {/* Navigation links */}
                <div className="flex-1 overflow-y-auto py-4 px-3">
                  {user && (
                    <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-muted/50">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
                        {user.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          location.pathname === link.to
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Contact link */}
                  <div className="mt-2 border-t border-border/20 pt-2">
                    <Link
                      to="/contact"
                      onClick={() => setOpen(false)}
                      className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        location.pathname === "/contact"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      📩 {t("landing.contact_title")}
                    </Link>
                  </div>

                  {!user && (
                    <div className="mt-4 space-y-2 px-1 sm:hidden">
                      <Link to="/signin" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">{t("nav.signin")}</Button>
                      </Link>
                      <Link to="/signup" onClick={() => setOpen(false)}>
                        <Button className="w-full bg-accent text-accent-foreground border-0 rounded-xl mt-2">{t("nav.signup")}</Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {user && (
                  <div className="p-4 border-t border-border/20">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => { signOut(); setOpen(false); }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.signout")}
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
