import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles = {
  brand: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneStyles;
  trend?: string;
}) => (
  <div className="surface-card group relative overflow-hidden p-5 transition-all duration-300 hover:shadow-elevated">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      </div>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          toneStyles[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
    </div>
    {(hint || trend) && (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {trend ? (
          <span className="font-semibold text-success">{trend}</span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    )}
  </div>
);
