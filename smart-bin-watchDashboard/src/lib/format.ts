import type { Bin, BinStatus } from "@/types/bin";

export const statusColor: Record<BinStatus, string> = {
  normal: "hsl(var(--status-normal))",
  medium: "hsl(var(--status-medium))",
  critical: "hsl(var(--status-critical))",
  anomaly: "hsl(var(--status-anomaly))",
};

export const statusBadgeClass: Record<BinStatus, string> = {
  normal: "bg-status-normal/15 text-status-normal border-status-normal/30",
  medium: "bg-status-medium/15 text-status-medium border-status-medium/30",
  critical: "bg-status-critical/15 text-status-critical border-status-critical/30",
  anomaly: "bg-status-anomaly/15 text-status-anomaly border-status-anomaly/30",
};

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(date: Date | null) {
  if (!date) return "—";
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  return `${m}m ago`;
}

export function exportBinsCSV(bins: Bin[]) {
  const headers = [
    "bin_id", "timestamp", "fill_level", "gas_level", "temperature",
    "humidity", "weight", "latitude", "longitude", "urgency",
    "is_anomaly", "anomaly_type", "dispatched", "pred_min_full",
  ];
  const rows = bins.map((b) => [
    b.bin_id, b.timestamp, b.fill_level, b.gas_level, b.temperature,
    b.humidity, b.weight, b.location.latitude, b.location.longitude,
    b.result.urgency, b.result.is_anomaly, b.result.anomaly_type ?? "",
    b.result.dispatched, b.result.pred_min_full,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bins-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
