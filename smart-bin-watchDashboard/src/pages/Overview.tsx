import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBins } from "@/hooks/useBins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BinMap } from "@/components/BinMap";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { statusOf } from "@/types/bin";
import { exportBinsCSV } from "@/lib/format";
import {
  AlertTriangle, Download, Search, Trash2, Activity, Gauge, Truck,
} from "lucide-react";

type SortKey = "bin_id" | "fill_level" | "temperature" | "gas_level" | "urgency";

export default function Overview() {
  const { bins, loading, lastUpdated, source, error } = useBins();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("fill_level");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = [...bins];
    if (query) list = list.filter((b) => b.bin_id.toLowerCase().includes(query.toLowerCase()));
    if (filter !== "all") {
      list = list.filter((b) => {
        if (filter === "anomaly") return b.result.is_anomaly;
        return b.result.urgency === filter;
      });
    }
    list.sort((a, b) => {
      const av = sortKey === "urgency" ? a.result.urgency : (a as any)[sortKey];
      const bv = sortKey === "urgency" ? b.result.urgency : (b as any)[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [bins, query, filter, sortKey, sortDir]);

  const totalBins = bins.length;
  const needCollection = bins.filter((b) => b.fill_level >= 85 || b.result.urgency === "critical").length;
  const anomalies = bins.filter((b) => b.result.is_anomaly);
  const avgFill = totalBins ? Math.round(bins.reduce((s, b) => s + b.fill_level, 0) / totalBins) : 0;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time status of all monitored bins</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator lastUpdated={lastUpdated} source={source} />
          <Button variant="outline" size="sm" onClick={() => exportBinsCSV(filtered)}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection notice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {anomalies.length > 0 && (
        <Alert className="border-status-anomaly/40 bg-status-anomaly/5">
          <AlertTriangle className="h-4 w-4 text-status-anomaly" />
          <AlertTitle className="text-status-anomaly">
            {anomalies.length} active {anomalies.length === 1 ? "anomaly" : "anomalies"}
          </AlertTitle>
          <AlertDescription>
            {anomalies.map((a) => `${a.bin_id} (${a.result.anomaly_type ?? "unknown"})`).join(" · ")}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Bins" value={totalBins} icon={Trash2} loading={loading} />
        <KpiCard label="Needs Collection" value={needCollection} icon={Truck} accent="critical" loading={loading} />
        <KpiCard label="Active Anomalies" value={anomalies.length} icon={Activity} accent="anomaly" loading={loading} />
        <KpiCard label="Avg Fill Level" value={`${avgFill}%`} icon={Gauge} accent={avgFill >= 70 ? "medium" : "normal"} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[380px]">
              {loading ? <Skeleton className="h-full w-full" /> : <BinMap bins={bins} />}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <Legend color="hsl(var(--status-normal))" label="Normal" />
              <Legend color="hsl(var(--status-medium))" label="Medium" />
              <Legend color="hsl(var(--status-critical))" label="Critical" />
              <Legend color="hsl(var(--status-anomaly))" label="Anomaly" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick filters</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by bin ID..."
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bins</SelectItem>
                <SelectItem value="critical">Critical urgency</SelectItem>
                <SelectItem value="medium">Medium urgency</SelectItem>
                <SelectItem value="low">Low urgency</SelectItem>
                <SelectItem value="anomaly">Anomalies only</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground pt-2">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of {bins.length} bins
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All bins</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <Th onClick={() => toggleSort("bin_id")} active={sortKey === "bin_id"}>Bin ID</Th>
                  <Th onClick={() => toggleSort("fill_level")} active={sortKey === "fill_level"}>Fill</Th>
                  <Th onClick={() => toggleSort("temperature")} active={sortKey === "temperature"}>Temp</Th>
                  <Th onClick={() => toggleSort("gas_level")} active={sortKey === "gas_level"}>Gas</Th>
                  <Th onClick={() => toggleSort("urgency")} active={sortKey === "urgency"}>Urgency</Th>
                  <TableHead>Anomaly</TableHead>
                  <TableHead>Dispatched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  filtered.map((b) => {
                    const status = statusOf(b);
                    return (
                      <TableRow
                        key={b.bin_id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/bin/${b.bin_id}`)}
                      >
                        <TableCell className="font-medium">{b.bin_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Progress value={b.fill_level} className="h-1.5" />
                            <span className="text-xs tabular-nums w-10 text-right">{b.fill_level.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{b.temperature.toFixed(1)}°C</TableCell>
                        <TableCell className="tabular-nums">{b.gas_level}</TableCell>
                        <TableCell><StatusBadge status={status === "anomaly" ? "anomaly" : (b.result.urgency === "low" ? "normal" : b.result.urgency === "medium" ? "medium" : "critical")} label={b.result.urgency} /></TableCell>
                        <TableCell>
                          {b.result.is_anomaly ? (
                            <StatusBadge status="anomaly" label={b.result.anomaly_type ?? "anomaly"} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {b.result.dispatched ? (
                            <span className="text-status-normal text-xs font-medium">Yes</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, accent, loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "normal" | "medium" | "critical" | "anomaly";
  loading?: boolean;
}) {
  const accentClass = {
    normal: "text-status-normal bg-status-normal/10",
    medium: "text-status-medium bg-status-medium/10",
    critical: "text-status-critical bg-status-critical/10",
    anomaly: "text-status-anomaly bg-status-anomaly/10",
  }[accent ?? "normal"];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-3xl font-semibold mt-1 tabular-nums">{value}</p>
            )}
          </div>
          <div className={`h-9 w-9 rounded-md grid place-items-center ${accent ? accentClass : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function Th({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <TableHead
      onClick={onClick}
      className={`cursor-pointer select-none ${active ? "text-foreground font-semibold" : ""}`}
    >
      {children}
    </TableHead>
  );
}
