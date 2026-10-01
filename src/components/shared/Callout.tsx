import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: { icon: Info, className: "border-border bg-muted/50 text-foreground" },
  warning: { icon: AlertTriangle, className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  danger: { icon: OctagonAlert, className: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300" },
};

export function Callout({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: tone } = variants[variant];
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-[13px]", tone, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        {title && <span className="font-medium">{title}</span>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}
