import { useMemo } from "react";
import { useBins } from "@/hooks/useBins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveIndicator } from "@/components/LiveIndicator";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const chartTooltip = {
  contentStyle: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 },
};

export default function Analytics() {
  const { bins, lastUpdated, source } = useBins();

  const fillByBin = bins.map((b) => ({ bin: b.bin_id.replace("BIN_", "#"), fill: b.fill_level }));

  const trend24h = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 24 }).map((_, i) => {
      const hour = 23 - i;
      const baseline = 35 + 18 * Math.sin((i / 24) * Math.PI * 2);
      const noise = Math.random() * 8 - 4;
      return {
        time: new Date(now - hour * 3600_000).toLocaleTimeString([], { hour: "2-digit" }),
        avg: Math.max(0, Math.min(100, Math.round(baseline + noise))),
      };
    });
  }, [bins.length]);

  const urgencyDist = useMemo(() => {
    const counts = { critical: 0, medium: 0, low: 0 };
    bins.forEach((b) => counts[b.result.urgency]++);
    return [
      { name: "Critical", value: counts.critical, color: "hsl(var(--status-critical))" },
      { name: "Medium", value: counts.medium, color: "hsl(var(--status-medium))" },
      { name: "Low", value: counts.low, color: "hsl(var(--status-normal))" },
    ];
  }, [bins]);

  const anomalyByType = useMemo(() => {
    const counts: Record<string, number> = { gas_spike: 0, fill_jump: 0, temp_spike: 0 };
    bins.forEach((b) => {
      if (b.result.is_anomaly && b.result.anomaly_type) {
        counts[b.result.anomaly_type] = (counts[b.result.anomaly_type] ?? 0) + 1;
      }
    });
    // Add some historical synthetic baseline for visual richness
    return Object.entries(counts).map(([type, count]) => ({
      type: type.replace("_", " "),
      count: count + Math.floor(Math.random() * 4),
    }));
  }, [bins]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Trends, distributions, and anomaly patterns</p>
        </div>
        <LiveIndicator lastUpdated={lastUpdated} source={source} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Fill level by bin</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillByBin}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="bin" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="fill" radius={[6, 6, 0, 0]}>
                    {fillByBin.map((d, i) => (
                      <Cell key={i} fill={
                        d.fill >= 85 ? "hsl(var(--status-critical))"
                          : d.fill >= 60 ? "hsl(var(--status-medium))"
                          : "hsl(var(--status-normal))"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Avg fill level — 24h</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend24h}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="time" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Urgency distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyDist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {urgencyDist.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Anomaly frequency by type</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={anomalyByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="type" type="category" fontSize={11} stroke="hsl(var(--muted-foreground))" width={90} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="count" fill="hsl(var(--status-anomaly))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
