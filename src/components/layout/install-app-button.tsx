import { useEffect, useState } from "react";
import { Download, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallAppButton = () => {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (!promptEvent) {
      setOpen(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-xs"
        onClick={() => void handleClick()}
        aria-label="Instalar la aplicación"
      >
        <Download className="size-4" />
        <span className="hidden lg:inline">Instalar app</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <MonitorSmartphone className="size-5 text-primary" /> Instala
              Nómina Clara
            </DialogTitle>
            <DialogDescription>
              Queda como una app en tu computador o celular, con ícono propio y
              sin barra del navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">Android</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Abre el menú del navegador (⋮) y elige{" "}
                <span className="font-medium text-foreground">
                  Instalar aplicación
                </span>{" "}
                o{" "}
                <span className="font-medium text-foreground">
                  Añadir a pantalla de inicio
                </span>
                .
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">
                iPhone o iPad
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                En Safari toca{" "}
                <span className="font-medium text-foreground">Compartir</span> y
                luego{" "}
                <span className="font-medium text-foreground">
                  Añadir a pantalla de inicio
                </span>
                .
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">
                Computador (Chrome o Edge)
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Usa el ícono de instalar de la barra de direcciones o el menú del
                navegador →{" "}
                <span className="font-medium text-foreground">
                  Instalar Nómina Clara
                </span>
                .
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
