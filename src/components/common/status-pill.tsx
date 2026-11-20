import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-destructive-soft text-destructive border-destructive/20",
  info: "bg-info-soft text-info border-info/20",
  brand: "bg-primary-soft text-primary border-primary/20",
};

export const Pill = ({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
      tones[tone],
      className,
    )}
  >
    {children}
  </span>
);

const statusMap: Record<string, Tone> = {
  borrador: "warning",
  revisado: "info",
  pagado: "success",
  activo: "success",
  retirado: "neutral",
  activa: "success",
  inactiva: "neutral",
  aprobada: "success",
  pendiente: "warning",
  rechazada: "danger",
  generado: "info",
  firmado: "success",
  indefinido: "brand",
  fijo: "info",
  "obra-labor": "warning",
  "prestacion-servicios": "neutral",
};

export const StatusPill = ({
  status,
  label,
}: {
  status: string;
  label?: string;
}) => (
  <Pill tone={statusMap[status] ?? "neutral"}>
    <span className="size-1.5 rounded-full bg-current" />
    {label ?? status.replace("-", " ")}
  </Pill>
);
