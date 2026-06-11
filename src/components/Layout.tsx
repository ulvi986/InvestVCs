import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import OriginBackground from "./OriginBackground";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-dvh flex-col">
    <OriginBackground />
    <Navbar />
    <main className="flex-1 relative z-10">{children}</main>
    <Footer />
  </div>
);

export default Layout;
