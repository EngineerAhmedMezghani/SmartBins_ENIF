export type Urgency = "critical" | "medium" | "low";

export interface BinResult {
  pred_min_full: number;
  predicted_full_at: string;
  urgency: Urgency;
  is_anomaly: boolean;
  anomaly_type: string | null;
  dispatched: boolean;
  trigger_reason: string | null;
}

export interface Bin {
  bin_id: string;
  timestamp: string;
  fill_level: number;
  gas_level: number;
  temperature: number;
  humidity: number;
  weight: number;
  location: { latitude: number; longitude: number };
  result: BinResult;
}

export interface DispatchStop {
  bin_id: string;
  fill_level: number;
  trigger_reason: string;
  opportunistic?: boolean;
}

export interface Dispatch {
  dispatch_id: string;
  generated_at: string;
  total_stops: number;
  stops: DispatchStop[];
}

export type BinStatus = "normal" | "medium" | "critical" | "anomaly";

export function statusOf(bin: Bin): BinStatus {
  if (bin.result.is_anomaly) return "anomaly";
  if (bin.fill_level >= 85 || bin.result.urgency === "critical") return "critical";
  if (bin.fill_level >= 60 || bin.result.urgency === "medium") return "medium";
  return "normal";
}
