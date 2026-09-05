import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <div className="relative text-center">
        <p className="font-origin-display text-[120px] sm:text-[180px] leading-none font-light text-origin-gradient">
          404
        </p>
        <h1 className="mt-2 text-2xl font-origin-display font-light text-[var(--ink-1)]">This page drifted off-chart</h1>
        <p className="mt-3 text-[var(--ink-2)] font-light max-w-sm mx-auto">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button variant="white" size="lg" className="origin-shimmer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
