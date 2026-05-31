import logoImg from "@/assets/logo.jpeg";

const Footer = () => (
  <footer className="relative z-10 border-t border-white/[0.06] bg-background/50 backdrop-blur-sm">
    <div className="container py-12">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <img src={logoImg} alt="InvestVCs" className="h-7 w-7 rounded-lg object-cover" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">InvestVCs</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} InvestVCs. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
