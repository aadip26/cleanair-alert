"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { categoryColor } from "@/lib/aqi";
import type { StationPoint } from "@/lib/types";

export default function AirMapInner({
  center,
  stations,
}: {
  center: [number, number];
  stations: StationPoint[];
}) {
  return (
    <MapContainer
      center={center}
      zoom={10}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((s) => (
        <CircleMarker
          key={s.name}
          center={[s.latitude, s.longitude]}
          radius={10}
          pathOptions={{
            color: categoryColor(s.category),
            fillColor: categoryColor(s.category),
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <strong>{s.name}</strong>
            <br />
            AQI: {s.nationalAqi} ({s.category})
            <br />
            Updated: {s.lastUpdate}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
