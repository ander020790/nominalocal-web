import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
        <span className="brand-gradient mx-auto flex size-12 items-center justify-center rounded-xl">
          <Wallet className="size-6 text-primary-foreground" />
        </span>
        <p className="mt-6 font-display text-4xl font-extrabold text-foreground">
          404
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No encontramos esta página en Nómina Clara. Puede que el enlace haya
          cambiado o que no tengas acceso a esta sección.
        </p>
        <Button className="mt-6 w-full" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Volver al panel
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
