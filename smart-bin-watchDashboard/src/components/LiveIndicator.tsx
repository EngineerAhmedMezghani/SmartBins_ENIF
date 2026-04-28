import { RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LiveIndicator({
  lastUpdated,
  source,
}: {
  lastUpdated: Date | null;
  source: "live" | "mock";
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const recent = lastUpdated && Date.now() - lastUpdated.getTime() < 1500;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          source === "live" ? "bg-status-normal" : "bg-status-medium",
        )}
      />
      <span className="hidden sm:inline">
        {source === "live" ? "Live" : "Mock"} · updated {formatRelative(lastUpdated)}
      </span>
      <RefreshCw className={cn("h-3.5 w-3.5", recent && "animate-spin")} />
    </div>
  );
}
