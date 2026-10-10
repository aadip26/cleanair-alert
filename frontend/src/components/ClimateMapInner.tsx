"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { drynessColor } from "@/lib/aqi";
import type { ClimatePlace } from "@/lib/types";

export default function ClimateMapInner({
  places,
  selectedYear,
}: {
  places: ClimatePlace[];
  selectedYear: number;
}) {
  const center: [number, number] = [22.5, 79];
  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => {
        const entry = place.years.find((y) => y.year === selectedYear);
        const color = drynessColor(entry?.dryness ?? "Near usual");
        return (
          <CircleMarker
            key={place.slug}
            center={[place.latitude, place.longitude]}
            radius={8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
          >
            <Popup>
              {place.name}, {place.state}
              <br />
              {selectedYear}: {entry?.rainMm ?? "—"} mm
              <br />
              {entry?.dryness ?? "Near usual"}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
