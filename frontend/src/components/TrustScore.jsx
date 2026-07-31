import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
export function TrustScore({
  score,
  size = "sm",
  className
}) {
  return <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 font-semibold text-primary",
      size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
      className
    )}
  >
      <ShieldCheck className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={2.4} />
      Trust {score}
    </span>;
}
