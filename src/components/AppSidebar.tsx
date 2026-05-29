import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage, Language } from "@/context/LanguageContext";
import {
  LayoutDashboard, Wallet, TrendingUp, Gauge, Briefcase, User,
  Shield, LogOut, Globe, Settings, ChevronDown, Sparkles,
} from "lucide-react";
import logoImg from "@/assets/logo.jpeg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const langLabels: Record<Language, string> = {
  en: "EN",
  tr: "TR",
  az: "AZ",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isInvestor, isInvestorPending } = useUserRole();
  const { t, language, setLanguage } = useLanguage();

  const isInvestorUser = isInvestor || isInvestorPending;

  const startupLinks = [
    { to: "/summary", label: t("nav.summary").replace("📊 ", ""), icon: LayoutDashboard },
    { to: "/preparation", label: t("nav.financial").replace("💰 ", ""), icon: Wallet },
    { to: "/evaluation", label: t("nav.evaluation"), icon: TrendingUp },
    { to: "/readiness", label: t("nav.readiness"), icon: Gauge },
    { to: "/vacancies", label: t("nav.vacancies").replace("💼 ", ""), icon: Briefcase },
  ];

  const investorLinks = [
    ...(isInvestor
      ? [
          { to: "/investor", label: t("nav.investor_dashboard").replace("📈 ", ""), icon: LayoutDashboard },
          { to: "/vacancies", label: t("nav.vacancies").replace("💼 ", ""), icon: Briefcase },
        ]
      : []),
    { to: "/profile", label: t("nav.profile").replace("👤 ", ""), icon: User },
  ];

  const links = [
    ...(isAdmin ? [{ to: "/admin", label: t("nav.admin").replace("🛡️ ", ""), icon: Shield }] : []),
    ...(isInvestorUser ? investorLinks : startupLinks),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-card">
        {/* Brand */}
        <div className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? "justify-center" : ""}`}>
          <img src={logoImg} alt="InvestVCs" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-display text-base font-bold text-foreground">InvestVCs</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {isInvestorUser ? "Investor" : isAdmin ? "Admin" : "Startup"}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.to)}
                    tooltip={link.label}
                  >
                    <Link
                      to={link.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive(link.to)
                          ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <link.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>{link.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile link for startup users */}
        {!isInvestorUser && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip={t("nav.profile")}>
                    <Link
                      to="/profile"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive("/profile")
                          ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <User className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>{t("nav.profile").replace("👤 ", "")}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="bg-card border-t border-border">
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between"} px-2 py-2`}>
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-8">
                <Globe className="h-3.5 w-3.5" />
                {!collapsed && langLabels[language]}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              {(Object.entries(langLabels) as [Language, string][]).map(([lang, label]) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? "bg-primary/10 text-primary" : ""}
                >
                  {lang === "en" ? "English" : lang === "tr" ? "Türkçe" : "Azərbaycan"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-destructive h-8 gap-1 text-xs"
            title={t("nav.signout")}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && <span>{t("nav.signout")}</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
