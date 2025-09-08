"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapProps {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  className?: string;
  geofence?: [number, number][]; // Array of [longitude, latitude] coordinate tuples
}

export default function Map({ center, zoom, className = "", geofence }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: center,
      zoom: zoom,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  // Add geofence layer if provided
  useEffect(() => {
    if (!map.current || !mapLoaded || !geofence || geofence.length < 3) return;

    // Check if source already exists and remove it
    if (map.current.getSource("geofence-source")) {
      map.current.removeLayer("geofence-fill");
      map.current.removeLayer("geofence-outline");
      map.current.removeSource("geofence-source");
    }

    // Add geofence source and layers
    map.current.addSource("geofence-source", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [geofence],
        },
      },
    });

    // Add fill layer
    map.current.addLayer({
      id: "geofence-fill",
      type: "fill",
      source: "geofence-source",
      layout: {},
      paint: {
        "fill-color": "#0ea5e9", // Primary color
        "fill-opacity": 0.3,
      },
    });

    // Add outline layer
    map.current.addLayer({
      id: "geofence-outline",
      type: "line",
      source: "geofence-source",
      layout: {},
      paint: {
        "line-color": "#0ea5e9",
        "line-width": 2,
      },
    });
  }, [geofence, mapLoaded]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full min-h-[300px] rounded-lg overflow-hidden ${className}`}
    />
  );
}
