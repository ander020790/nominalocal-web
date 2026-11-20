import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export const EmployeeAvatar = ({
  firstName,
  lastName,
  className,
}: {
  firstName: string;
  lastName: string;
  className?: string;
}) => (
  <span
    className={cn(
      "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary",
      className,
    )}
  >
    {initials(firstName, lastName)}
  </span>
);
