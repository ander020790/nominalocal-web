import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft">
      <Icon className="size-5" />
    </span>
    <div className="space-y-1">
      <p className="font-display text-base font-semibold text-foreground">
        {title}
      </p>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
    {action}
  </div>
);
