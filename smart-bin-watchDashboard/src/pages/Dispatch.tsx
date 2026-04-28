import { useMemo, useState } from "react";
import { useBins } from "@/hooks/useBins";
import { generateMockDispatch } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BinMap } from "@/components/BinMap";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Truck, MapPin } from "lucide-react";

export default function Dispatch() {
  const { bins, loading, lastUpdated, source } = useBins();
  const [showOpportunistic, setShowOpportunistic] = useState(true);

  const dispatch = useMemo(() => generateMockDispatch(bins), [bins]);
  const stops = showOpportunistic ? dispatch.stops : dispatch.stops.filter((s) => !s.opportunistic);
  const orderedIds = stops.map((s) => s.bin_id);
  const routeBins = bins.filter((b) => orderedIds.includes(b.bin_id));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch &amp; Routes</h1>
          <p className="text-sm text-muted-foreground">Active collection plan generated from bin telemetry</p>
        </div>
        <LiveIndicator lastUpdated={lastUpdated} source={source} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dispatch ID</p>
            <p className="text-base font-mono mt-1 break-all">{dispatch.dispatch_id}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Generated</p>
            <p className="text-base font-medium mt-1">{new Date(dispatch.generated_at).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Stops</p>
            <p className="text-3xl font-semibold mt-1 tabular-nums flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              {stops.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="opp" checked={showOpportunistic} onCheckedChange={setShowOpportunistic} />
        <Label htmlFor="opp" className="text-sm cursor-pointer">Show opportunistic stops</Label>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3"><CardTitle className="text-base">Route map</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[460px]">
              {loading ? <Skeleton className="h-full w-full" /> : <BinMap bins={routeBins} routeOrder={orderedIds} />}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Stop sequence</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ol className="divide-y divide-border">
              {stops.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">No stops in current dispatch.</li>
              )}
              {stops.map((stop, i) => (
                <li key={stop.bin_id} className="p-4 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {stop.bin_id}
                      </span>
                      <span className="text-sm tabular-nums font-medium">{stop.fill_level.toFixed(0)}%</span>
                    </div>
                    <Progress value={stop.fill_level} className="h-1 mt-2" />
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={
                          stop.opportunistic
                            ? "bg-status-medium/10 text-status-medium border-status-medium/30 text-xs"
                            : stop.trigger_reason.startsWith("anomaly")
                              ? "bg-status-anomaly/10 text-status-anomaly border-status-anomaly/30 text-xs"
                              : "bg-status-critical/10 text-status-critical border-status-critical/30 text-xs"
                        }
                      >
                        {stop.trigger_reason}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
