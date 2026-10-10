"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { drynessColor } from "@/lib/aqi";
import type { DroughtPlaceEntry } from "@/lib/types";

export default function DroughtMapInner({
  places,
  selectedYear,
}: {
  places: DroughtPlaceEntry[];
  selectedYear: number;
}) {
  const center: [number, number] = [22.5, 79];
  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => {
        const entry = place.seasons.find((s) => s.year === selectedYear);
        const affected = entry?.affected ?? false;
        const color = affected
          ? drynessColor("Drier than usual")
          : drynessColor(entry?.dryness ?? "Near usual");
        return (
          <CircleMarker
            key={place.slug}
            center={[place.latitude, place.longitude]}
            radius={affected ? 11 : 7}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: affected ? 0.95 : 0.55,
              weight: affected ? 3 : 1,
            }}
          >
            <Popup>
              {place.name}, {place.state}
              <br />
              {selectedYear} monsoon: {entry?.monsoonRainMm ?? "—"} mm
              <br />
              {affected ? "Rain-deficit stress" : entry?.dryness ?? "Near usual"}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
