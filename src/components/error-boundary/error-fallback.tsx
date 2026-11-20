import { useEffect } from "react";
import { getErrorMessage, type FallbackProps } from "react-error-boundary";

import { Button } from "@/components/ui/button";

/** Pantalla de respaldo cuando un error de render escapa de una página. */
export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  // Los detalles ayudan durante la construcción; las builds publicadas no los muestran.
  const details = import.meta.env.DEV ? getErrorMessage(error) : undefined;

  // En desarrollo, la vista previa se actualiza mientras se edita el código.
  // Si un módulo queda desincronizado, recargamos una vez para recuperar la app.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const key = "nc-auto-reload";
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last > 15000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, []);

  return (
    <div
      role="alert"
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
        <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
          Algo salió mal
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Ocurrió un error inesperado en esta pantalla. Tu información está a
          salvo: vuelve a intentarlo o recarga la aplicación.
        </p>
        {details && (
          <pre className="mb-6 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {details}
          </pre>
        )}
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={resetErrorBoundary}>Reintentar</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recargar aplicación
          </Button>
        </div>
      </div>
    </div>
  );
};
