import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Globe } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage, Language } from "@/context/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImg from "@/assets/logo.jpeg";

const langLabels: Record<Language, string> = {
  en: "English",
  tr: "Türkçe",
  az: "Azərbaycan",
};

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isInvestor, isInvestorPending } = useUserRole();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInvestorUser = isInvestor || isInvestorPending;

  const links = user
    ? [
        ...(isAdmin ? [{ to: "/admin", label: t("nav.admin") }] : []),
        // Investor: pending → only Profile; approved → full menu
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
        // Startup users
        ...(!isInvestorUser
          ? [
              { to: "/evaluation", label: t("nav.evaluation") },
              { to: "/preparation", label: t("nav.financial") },
              { to: "/readiness", label: t("nav.readiness") },
              { to: "/summary", label: t("nav.summary") },
              { to: "/vacancies", label: t("nav.vacancies") },
              { to: "/profile", label: t("nav.profile") },
            ]
          : []),
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <img src={logoImg} alt="InvestVCs" className="h-8 w-8 rounded-lg object-cover" />
          InvestVCs
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
                {langLabels[language]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(langLabels) as Language[]).map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? "bg-primary/10 text-primary" : ""}
                >
                  {langLabels[lang]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <Button variant="ghost" size="icon" onClick={signOut} title={t("nav.signout")}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="ghost">{t("nav.signin")}</Button>
              </Link>
              <Link to="/signup">
                <Button className="gradient-primary text-primary-foreground border-0 shadow-elevated">
                  {t("nav.signup")}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card p-4 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          {/* Mobile language switcher */}
          <div className="flex gap-2 mt-2 px-4">
            {(Object.keys(langLabels) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  language === lang
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {langLabels[lang]}
              </button>
            ))}
          </div>

          {user ? (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
              {t("nav.signout")}
            </Button>
          ) : (
            <>
              <Link to="/signin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="mt-2 w-full">{t("nav.signin")}</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="mt-2 w-full gradient-primary text-primary-foreground border-0">
                  {t("nav.signup")}
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
