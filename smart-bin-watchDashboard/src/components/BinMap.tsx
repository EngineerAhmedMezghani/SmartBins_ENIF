import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";
import type { Bin } from "@/types/bin";
import { statusOf } from "@/types/bin";
import { statusColor } from "@/lib/format";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

interface Props {
  bins: Bin[];
  height?: string;
  routeOrder?: string[]; // bin_ids in visit order
  onBinClick?: (binId: string) => void;
}

export function BinMap({ bins, height = "100%", routeOrder, onBinClick }: Props) {
  const navigate = useNavigate();

  const center = useMemo<[number, number]>(() => {
    if (!bins.length) return [38.7223, -9.1393];
    const lat = bins.reduce((s, b) => s + b.location.latitude, 0) / bins.length;
    const lng = bins.reduce((s, b) => s + b.location.longitude, 0) / bins.length;
    return [lat, lng];
  }, [bins]);

  const routeCoords = useMemo<[number, number][]>(() => {
    if (!routeOrder) return [];
    return routeOrder
      .map((id) => bins.find((b) => b.bin_id === id))
      .filter((b): b is Bin => !!b)
      .map((b) => [b.location.latitude, b.location.longitude]);
  }, [routeOrder, bins]);

  return (
    <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-border">
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "hsl(222 47% 40%)", weight: 3, dashArray: "6 6", opacity: 0.8 }}
          />
        )}
        {bins.map((b) => {
          const status = statusOf(b);
          const color = statusColor[status];
          return (
            <CircleMarker
              key={b.bin_id}
              center={[b.location.latitude, b.location.longitude]}
              radius={10}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
              eventHandlers={{
                click: () => (onBinClick ? onBinClick(b.bin_id) : navigate(`/bin/${b.bin_id}`)),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <div className="font-semibold">{b.bin_id}</div>
                  <div>Fill: {b.fill_level.toFixed(0)}%</div>
                  <div>Status: {status}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
