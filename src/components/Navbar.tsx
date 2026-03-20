import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import logoImg from "@/assets/logo.jpeg";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isInvestor } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user
    ? [
        ...(isAdmin ? [{ to: "/admin", label: "🛡️ Admin Panel" }] : []),
        ...(isInvestor
          ? [
              { to: "/investor", label: "📈 Investor Dashboard" },
              { to: "/vacancies", label: "💼 Vacancies" },
              { to: "/profile", label: "👤 Profile" },
            ]
          : []),
        ...(!isInvestor
          ? [
              { to: "/evaluation", label: "Startup Evaluation" },
              { to: "/preparation", label: "Financial Management" },
              { to: "/readiness", label: "Readiness Level" },
              { to: "/summary", label: "📊 Overall Summary" },
              { to: "/vacancies", label: "💼 Vacancies" },
              { to: "/profile", label: "👤 Profile" },
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

        {user ? (
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="gradient-primary text-primary-foreground border-0 shadow-elevated">
                Get Started
              </Button>
            </Link>
          </div>
        )}

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
          {user ? (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
              Sign Out
            </Button>
          ) : (
            <>
              <Link to="/signin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="mt-2 w-full">Sign In</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="mt-2 w-full gradient-primary text-primary-foreground border-0">
                  Get Started
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
