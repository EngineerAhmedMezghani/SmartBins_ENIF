import type { Bin, Dispatch } from "@/types/bin";

// Approx Lisbon coords for demo
const SEEDS: Array<{ id: string; lat: number; lng: number }> = [
  { id: "BIN_01", lat: 38.7223, lng: -9.1393 },
  { id: "BIN_02", lat: 38.7253, lng: -9.1502 },
  { id: "BIN_03", lat: 38.7169, lng: -9.1399 },
  { id: "BIN_04", lat: 38.7318, lng: -9.1418 },
  { id: "BIN_05", lat: 38.7195, lng: -9.1271 },
  { id: "BIN_06", lat: 38.7280, lng: -9.1577 },
];

let tick = 0;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function generateMockBins(): Bin[] {
  tick++;
  return SEEDS.map((s, i) => {
    // Deterministic-ish baseline + drift
    const base = [30, 72, 91, 45, 63, 18][i];
    const drift = ((tick + i * 3) % 20) - 5;
    const fill = Math.max(0, Math.min(100, base + drift + rand(-3, 3)));
    const isAnomaly = i === 2 ? Math.random() > 0.5 : Math.random() > 0.92;
    const gas = isAnomaly && i === 2 ? rand(700, 1100) : rand(80, 320);
    const urgency: Bin["result"]["urgency"] =
      fill >= 85 ? "critical" : fill >= 60 ? "medium" : "low";
    const minFull = Math.max(1, Math.round((100 - fill) * rand(2, 6)));
    const predDate = new Date(Date.now() + minFull * 60_000);

    return {
      bin_id: s.id,
      timestamp: new Date().toISOString(),
      fill_level: Math.round(fill * 10) / 10,
      gas_level: Math.round(gas),
      temperature: Math.round(rand(18, 32) * 10) / 10,
      humidity: Math.round(rand(35, 75)),
      weight: Math.round(fill * rand(0.4, 0.6) * 10) / 10,
      location: { latitude: s.lat, longitude: s.lng },
      result: {
        pred_min_full: minFull,
        predicted_full_at: predDate.toISOString(),
        urgency,
        is_anomaly: isAnomaly,
        anomaly_type: isAnomaly
          ? gas > 600
            ? "gas_spike"
            : Math.random() > 0.5
              ? "fill_jump"
              : "temp_spike"
          : null,
        dispatched: fill >= 85 || isAnomaly,
        trigger_reason:
          fill >= 90
            ? "fill>=90%"
            : isAnomaly
              ? `anomaly_${gas > 600 ? "gas_spike" : "fill_jump"}`
              : fill >= 65
                ? "opportunistic>=65%"
                : null,
      },
    };
  });
}

export function generateMockDispatch(bins: Bin[]): Dispatch {
  const stops = bins
    .filter((b) => b.result.dispatched || b.fill_level >= 65)
    .map((b) => ({
      bin_id: b.bin_id,
      fill_level: b.fill_level,
      trigger_reason:
        b.result.trigger_reason ??
        (b.fill_level >= 90
          ? "fill>=90%"
          : b.result.is_anomaly
            ? `anomaly_${b.result.anomaly_type ?? "unknown"}`
            : "opportunistic>=65%"),
      opportunistic: b.fill_level < 85 && !b.result.is_anomaly,
    }))
    .sort((a, b) => b.fill_level - a.fill_level);

  return {
    dispatch_id: `DSP-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`,
    generated_at: new Date().toISOString(),
    total_stops: stops.length,
    stops,
  };
}

// Generate a synthetic fill-history curve (last N points + projection)
export function generateFillHistory(currentFill: number, minutesUntilFull: number) {
  const points: { t: string; fill: number; projected?: boolean }[] = [];
  const now = Date.now();
  // 24 historical points (last 12 hours, 30 min apart)
  for (let i = 24; i >= 1; i--) {
    const fill = Math.max(0, currentFill - (i * (currentFill / 26)) + (Math.random() * 4 - 2));
    points.push({
      t: new Date(now - i * 30 * 60_000).toISOString(),
      fill: Math.round(fill * 10) / 10,
    });
  }
  points.push({ t: new Date(now).toISOString(), fill: currentFill });
  // projection
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const f = Math.min(100, currentFill + ((100 - currentFill) * i) / steps);
    points.push({
      t: new Date(now + (i * minutesUntilFull * 60_000) / steps).toISOString(),
      fill: Math.round(f * 10) / 10,
      projected: true,
    });
  }
  return points;
}
