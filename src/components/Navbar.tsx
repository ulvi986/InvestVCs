import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/evaluation", label: "Startup Evaluation" },
    { to: "/preparation", label: "Financial Management" },
    { to: "/readiness", label: "Readiness Level" },
    { to: "/summary", label: "📊 Overall Summary" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          StartupEval
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/evaluation">
            <Button className="gradient-primary text-primary-foreground border-0 shadow-elevated">
              Start Evaluation
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} title="Çıxış">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden">
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
          <Link to="/evaluation" onClick={() => setMobileOpen(false)}>
            <Button className="mt-2 w-full gradient-primary text-primary-foreground border-0">
              Start Evaluation
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
