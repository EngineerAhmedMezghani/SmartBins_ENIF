import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BinStatus } from "@/types/bin";
import { statusBadgeClass } from "@/lib/format";

export function StatusBadge({ status, label }: { status: BinStatus; label?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", statusBadgeClass[status])}>
      {label ?? status}
    </Badge>
  );
}
