import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Thermometer, Droplets, Wind, Weight, Clock, AlertTriangle } from "lucide-react";
import { useBins } from "@/hooks/useBins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BinMap } from "@/components/BinMap";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { statusOf } from "@/types/bin";
import { generateFillHistory } from "@/lib/mockData";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

export default function BinDetail() {
  const { binId } = useParams();
  const { bins, loading, lastUpdated, source } = useBins();
  const bin = bins.find((b) => b.bin_id === binId);

  const history = useMemo(
    () => (bin ? generateFillHistory(bin.fill_level, bin.result.pred_min_full) : []),
    [bin?.fill_level, bin?.result.pred_min_full],
  );

  if (loading && !bin) {
    return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }
  if (!bin) {
    return (
      <div className="p-8">
        <Link to="/"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        <p className="mt-4 text-muted-foreground">Bin not found.</p>
      </div>
    );
  }

  const status = statusOf(bin);
  const predTime = new Date(bin.result.predicted_full_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{bin.bin_id}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground">Last reading {new Date(bin.timestamp).toLocaleString()}</p>
          </div>
        </div>
        <LiveIndicator lastUpdated={lastUpdated} source={source} />
      </div>

      {bin.result.is_anomaly && (
        <Card className="border-status-anomaly/40 bg-status-anomaly/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-status-anomaly mt-0.5" />
            <div>
              <p className="font-medium text-status-anomaly">Anomaly: {bin.result.anomaly_type}</p>
              <p className="text-sm text-muted-foreground">Trigger: {bin.result.trigger_reason ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Fill Level" value={`${bin.fill_level.toFixed(1)}%`}>
          <Progress value={bin.fill_level} className="h-1.5 mt-3" />
        </MetricCard>
        <MetricCard label="Temperature" value={`${bin.temperature.toFixed(1)}°C`} icon={Thermometer} />
        <MetricCard label="Humidity" value={`${bin.humidity}%`} icon={Droplets} />
        <MetricCard label="Gas Level" value={`${bin.gas_level} ppm`} icon={Wind} accent={bin.gas_level > 600 ? "anomaly" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fill level — last 12h & projection</CardTitle>
              <span className="text-xs text-muted-foreground">dashed = projected</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--status-medium))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--status-medium))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(t) => new Date(t as string).toLocaleString()}
                  />
                  <ReferenceLine y={85} stroke="hsl(var(--status-critical))" strokeDasharray="4 4" />
                  <ReferenceLine x={history[24]?.t} stroke="hsl(var(--muted-foreground))" />
                  <Area
                    type="monotone"
                    dataKey="fill"
                    stroke="hsl(var(--status-medium))"
                    fill="url(#fillGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">ML Prediction</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <Clock className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
              <p className="text-3xl font-semibold tabular-nums">{bin.result.pred_min_full}<span className="text-base font-normal text-muted-foreground"> min</span></p>
              <p className="text-sm text-muted-foreground mt-1">until full · est. {predTime}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Urgency</p>
                <StatusBadge status={bin.result.urgency === "low" ? "normal" : bin.result.urgency === "medium" ? "medium" : "critical"} label={bin.result.urgency} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dispatched</p>
                <p className="text-sm font-medium mt-1">{bin.result.dispatched ? "Yes" : "No"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Sensor gauges</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Gauge label="Temperature" value={bin.temperature} max={50} unit="°C" />
            <Gauge label="Humidity" value={bin.humidity} max={100} unit="%" />
            <Gauge label="Gas Level" value={bin.gas_level} max={1200} unit=" ppm" critical={600} />
            <Gauge label="Weight" value={bin.weight} max={60} unit=" kg" icon={Weight} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <BinMap bins={[bin]} />
            </div>
            <p className="text-xs text-muted-foreground mt-3 tabular-nums">
              {bin.location.latitude.toFixed(5)}, {bin.location.longitude.toFixed(5)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, icon: Icon, accent, children,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "anomaly";
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          {Icon && <Icon className={`h-4 w-4 ${accent === "anomaly" ? "text-status-anomaly" : "text-muted-foreground"}`} />}
        </div>
        <p className={`text-2xl font-semibold mt-1 tabular-nums ${accent === "anomaly" ? "text-status-anomaly" : ""}`}>{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Gauge({
  label, value, max, unit, critical, icon: Icon,
}: {
  label: string; value: number; max: number; unit: string; critical?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const isCritical = critical !== undefined && value >= critical;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          {label}
        </span>
        <span className={`text-sm tabular-nums font-medium ${isCritical ? "text-status-anomaly" : ""}`}>
          {value.toFixed(value < 10 ? 1 : 0)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isCritical ? "hsl(var(--status-anomaly))" : "hsl(var(--primary))",
          }}
        />
      </div>
    </div>
  );
}
