import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Bin } from "@/types/bin";
import { generateMockBins } from "@/lib/mockData";

const API_URL = "http://localhost:8080/api/2/things/org.Iotp2c:iwatch";
const AUTH = `Basic ${btoa("ditto:ditto")}`;
const POLL_MS = 10_000;

interface UseBinsState {
  bins: Bin[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  source: "live" | "mock";
}

export function useBins() {
  const [state, setState] = useState<UseBinsState>({
    bins: [],
    loading: true,
    error: null,
    lastUpdated: null,
    source: "mock",
  });
  const previousAnomalies = useRef<Set<string>>(new Set());
  const failureCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const fetchBins = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(API_URL, {
          headers: { Authorization: AUTH },
          signal: controller.signal,
        });
        clearTimeout(t);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const binsObj = json?.attributes?.bins ?? {};
        const bins = Object.values(binsObj) as Bin[];
        if (!bins.length) throw new Error("No bins in response");
        failureCount.current = 0;
        if (!cancelled) {
          checkAnomalies(bins);
          setState({
            bins,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            source: "live",
          });
        }
      } catch (err) {
        failureCount.current++;
        const bins = generateMockBins();
        if (!cancelled) {
          checkAnomalies(bins);
          setState({
            bins,
            loading: false,
            error:
              failureCount.current === 1
                ? `Live API unreachable — using mock data`
                : null,
            lastUpdated: new Date(),
            source: "mock",
          });
        }
      }
    };

    const checkAnomalies = (bins: Bin[]) => {
      const current = new Set(
        bins.filter((b) => b.result.is_anomaly).map((b) => b.bin_id),
      );
      current.forEach((id) => {
        if (!previousAnomalies.current.has(id)) {
          const b = bins.find((x) => x.bin_id === id);
          toast.error(`Anomaly detected: ${id}`, {
            description: b?.result.anomaly_type
              ? `Type: ${b.result.anomaly_type}`
              : undefined,
          });
        }
      });
      previousAnomalies.current = current;
    };

    fetchBins();
    const interval = setInterval(fetchBins, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
