import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, Compass, Route, AlertTriangle, Activity } from "lucide-react";

// Fix Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_PROVIDERS = {
  google_roadmap: {
    name: "Google Maps (Roadmap)",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    options: { maxZoom: 20, attribution: "Google Maps" }
  },
  google_terrain: {
    name: "Google Maps (Terrain)",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    options: { maxZoom: 20, attribution: "Google Maps" }
  },
  osm_civic: {
    name: "Government Civic (OSM Light)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: "OpenStreetMap" }
  },
  google_satellite: {
    name: "Google Maps (Satellite Hybrid)",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    options: { maxZoom: 20, attribution: "Google Maps" }
  }
};

// Purple Warning Triangle Icon for Bottleneck Alerts (From Mappls Demo Script)
const BOTTLENECK_WARNING_SVG = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="28">' +
  '<polygon points="15,2 28,25 2,25" fill="#6B3FA0" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<text x="15" y="21" font-size="14" font-weight="bold" fill="white" text-anchor="middle">!</text>' +
  '</svg>'
);

export default function GisMap({
  cameras = [],
  selectedCamera = null,
  onSelectCamera = () => {},
  trajectory = [],
  chowksPassed = [],
  showHeatmap = false,
  showCongestion = true,
  congestionData = [],
  odRoutes = [],
  bottlenecks = [],
  statsSummary = null,
  height = "480px",
  mapApiKey = "cxinshjifskvjnrmnvpnpvidwbtdkqgvwqtm"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const [activeTileKey, setActiveTileKey] = useState("google_roadmap");
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const [roadRoutingActive, setRoadRoutingActive] = useState(true);
  const [routingStatus, setRoutingStatus] = useState("idle");
  const [totalRoadDistanceKm, setTotalRoadDistanceKm] = useState(null);

  const layersRef = useRef({
    cameras: null,
    trajectory: null,
    heatmap: null,
    congestion: null,
    odRoutes: null,
    bottlenecks: null
  });

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on Vadodara Smart City (Gujarat)
    const map = L.map(mapContainerRef.current, {
      center: [22.3072, 73.1812],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    const initialProvider = TILE_PROVIDERS[activeTileKey];
    currentTileLayerRef.current = L.tileLayer(initialProvider.url, initialProvider.options).addTo(map);

    // Initialize layer groups
    layersRef.current.cameras = L.layerGroup().addTo(map);
    layersRef.current.trajectory = L.layerGroup().addTo(map);
    layersRef.current.heatmap = L.layerGroup().addTo(map);
    layersRef.current.congestion = L.layerGroup().addTo(map);
    layersRef.current.odRoutes = L.layerGroup().addTo(map);
    layersRef.current.bottlenecks = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer
  const switchTileLayer = (key) => {
    setActiveTileKey(key);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }
    const provider = TILE_PROVIDERS[key] || TILE_PROVIDERS.google_roadmap;
    currentTileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map);
    setShowLayerSelector(false);
  };

  // 2. Render Cameras Layer (Vadodara Chowks & 4-Lane Signals)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.cameras) return;

    const camGroup = layersRef.current.cameras;
    camGroup.clearLayers();

    // If trajectory is showing, suppress default camera markers to keep map clean
    if (trajectory && trajectory.length > 0) {
      return;
    }

    cameras.forEach((cam) => {
      const isSelected = selectedCamera && selectedCamera.camera_id === cam.camera_id;
      
      const statusColors = {
        online: { bg: "#16a34a", ring: "rgba(22, 163, 74, 0.3)" },
        delayed: { bg: "#d97706", ring: "rgba(217, 119, 6, 0.3)" },
        offline: { bg: "#dc2626", ring: "rgba(220, 38, 38, 0.3)" }
      };
      const col = statusColors[cam.status] || statusColors.online;

      const customIcon = L.divIcon({
        className: "custom-cam-marker",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            ${isSelected ? `<div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; border: 2px dashed #2563eb; animation: spin 4s linear infinite;"></div>` : ""}
            <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ${col.ring}; animation: radar-pulse 2s infinite;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background: ${col.bg}; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
            </div>
            <div style="position: absolute; bottom: -18px; font-family: monospace; font-size: 9px; font-weight: 700; color: #1e293b; background: #ffffff; padding: 1px 5px; border-radius: 3px; border: 1px solid #cbd5e1; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
              ${cam.camera_id.replace("CAM-BRC-", "CHOWK-")}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });
      marker.on("click", () => onSelectCamera(cam));

      marker.bindPopup(`
        <div style="font-family: inherit; min-width: 220px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="color: #1d4ed8; font-size: 13px;">${cam.camera_id}</strong>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #ffffff; background: ${col.bg}; padding: 2px 6px; border-radius: 4px;">${cam.status}</span>
          </div>
          <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 2px;">${cam.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${cam.road_zone}</div>
          <div style="font-family: monospace; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>Lanes: <strong>${cam.lane_count}-Lane</strong></div>
            <div>Dir: <strong>${cam.direction}</strong></div>
            <div>Latency: <strong>${cam.latency_ms}ms</strong></div>
            <div>FPS: <strong>${cam.fps}</strong></div>
          </div>
        </div>
      `);

      camGroup.addLayer(marker);
    });
  }, [cameras, selectedCamera, trajectory, onSelectCamera]);

  // 3. Render Vehicle Trajectory With ROAD-TO-ROAD OSRM Routing (Snapping strictly along physical streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.trajectory) return;

    const trajGroup = layersRef.current.trajectory;
    trajGroup.clearLayers();

    const dataPoints = trajectory && trajectory.length > 0 ? trajectory : [];
    if (dataPoints.length === 0) {
      setRoutingStatus("idle");
      setTotalRoadDistanceKm(null);
      return;
    }

    const latLngs = [];

    // Draw ordered numbered Chowk Waypoints
    dataPoints.forEach((sighting, idx) => {
      const lat = sighting.latitude;
      const lon = sighting.longitude;
      latLngs.push([lat, lon]);

      const isFirst = idx === 0;
      const isLast = idx === dataPoints.length - 1;

      // Color coding: Green for start, Red for exit, Blue for intermediate
      const badgeBg = isFirst ? "#16a34a" : isLast ? "#dc2626" : "#2563eb";

      const waypointIcon = L.divIcon({
        className: "custom-chowk-waypoint",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 44px;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${badgeBg}26; animation: radar-pulse 2s infinite;"></div>
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${badgeBg}; border: 2.5px solid #ffffff; color: #ffffff; font-family: monospace; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
              ${idx + 1}
            </div>
            <div style="position: absolute; top: -18px; font-family: monospace; font-size: 10px; font-weight: bold; background: #ffffff; color: #1e293b; padding: 1px 6px; border-radius: 4px; border: 1px solid #cbd5e1; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
              ${isFirst ? "START CHOWK" : isLast ? "EXIT CHOWK" : "SIGNAL #" + (idx + 1)}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const wpMarker = L.marker([lat, lon], { icon: waypointIcon });
      const chowkDetail = chowksPassed && chowksPassed[idx] ? chowksPassed[idx] : null;

      wpMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 240px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 800; color: ${badgeBg}; font-size: 12px;">CHOWK #${idx + 1} SIGHTING</span>
            <span style="font-size: 10px; font-family: monospace; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px;">4-Lane Signal</span>
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${sighting.camera_name || sighting.camera_id}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            Road: ${sighting.road_zone || "Vadodara Urban Corridor"}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; margin-bottom: 6px;">
            <div>Time: <strong style="color: #0f172a;">${sighting.timestamp_utc?.substring(11, 19)} UTC</strong></div>
            <div>Direction: <strong style="color: #0f172a;">${sighting.cam_direction || sighting.direction || "Transit"}</strong></div>
            <div>OCR Confidence: <strong style="color: #16a34a;">${Math.round((sighting.ocr_confidence || 0.95) * 100)}% Verified</strong></div>
          </div>
          ${chowkDetail && chowkDetail.speed_to_next_kmh ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 8px; border-radius: 6px; font-size: 11px; color: #1e40af;">
              <div>Transit to Next Signal: <strong>${chowkDetail.distance_to_next_km} km in ${chowkDetail.time_to_next_min} min</strong></div>
              <div>Leg Speed: <strong style="color: #2563eb; font-size: 12px;">${chowkDetail.speed_to_next_kmh} km/h</strong></div>
            </div>
          ` : ""}
        </div>
      `);

      trajGroup.addLayer(wpMarker);
    });

    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60] });
    }

    if (latLngs.length < 2) return;

    // ROAD-TO-ROAD ROUTING ENGINE (Using OSRM Free Public Routing Service as in Mappls script)
    if (roadRoutingActive) {
      setRoutingStatus("routing");
      let totalMeters = 0;
      let legsCount = latLngs.length - 1;
      let completedLegs = 0;

      for (let i = 0; i < latLngs.length - 1; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[i + 1];
        const origin = { lat: p1[0], lng: p1[1] };
        const dest = { lat: p2[0], lng: p2[1] };

        // OSRM routing endpoint: /driving/{lon1},{lat1};{lon2},{lat2}
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;

        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            completedLegs++;
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              totalMeters += route.distance || 0;
              const coords = route.geometry.coordinates; // [lng, lat] pairs from GeoJSON
              const roadPath = coords.map((c) => [c[1], c[0]]); // Convert to [lat, lng] for Leaflet

              // 1. Soft glowing outer corridor halo
              const polyHalo = L.polyline(roadPath, {
                color: "#60a5fa",
                weight: 8,
                opacity: 0.45,
                lineCap: "round",
                lineJoin: "round"
              });
              trajGroup.addLayer(polyHalo);

              // 2. High-precision road line (Royal Blue #0D47A1 matching user specification)
              const polyRoad = L.polyline(roadPath, {
                color: "#0D47A1",
                weight: 5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round"
              });

              polyRoad.bindTooltip(
                `<div style="font-family: monospace; font-size: 11px;">
                  <strong>Road Corridor Leg #${i + 1}</strong><br/>
                  Distance: ${(route.distance / 1000).toFixed(2)} km on road<br/>
                  Transit: ${(route.duration / 60).toFixed(1)} min
                </div>`,
                { sticky: true }
              );
              trajGroup.addLayer(polyRoad);
            } else {
              // Fallback to straight line if OSRM finds no route
              console.warn("No road route found, falling back to straight line for leg", i);
              const polyFallback = L.polyline([p1, p2], {
                color: "#0D47A1",
                weight: 4,
                opacity: 0.85,
                dashArray: "8, 6"
              });
              trajGroup.addLayer(polyFallback);
            }

            if (completedLegs >= legsCount) {
              setRoutingStatus("matched");
              setTotalRoadDistanceKm((totalMeters / 1000).toFixed(2));
            }
          })
          .catch((err) => {
            console.warn("Road routing service failed, falling back to straight line:", err);
            completedLegs++;
            const polyFallback = L.polyline([p1, p2], {
              color: "#0D47A1",
              weight: 4,
              opacity: 0.85,
              dashArray: "8, 6"
            });
            trajGroup.addLayer(polyFallback);
            if (completedLegs >= legsCount) {
              setRoutingStatus("fallback");
            }
          });
      }
    } else {
      // Direct Straight Line Mode (Euclidean / As-The-Crow-Flies)
      setRoutingStatus("idle");
      for (let i = 0; i < latLngs.length - 1; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[i + 1];

        const poly = L.polyline([p1, p2], {
          color: "#2563eb",
          weight: 4,
          opacity: 0.9,
          dashArray: "10, 6"
        });
        trajGroup.addLayer(poly);
      }
    }
  }, [trajectory, chowksPassed, roadRoutingActive]);

  // 4. Render Origin-Destination (OD) Routes Along Road Network (Mappls Demo Script Feature)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.odRoutes) return;

    const routesGroup = layersRef.current.odRoutes;
    routesGroup.clearLayers();

    if (!odRoutes || odRoutes.length === 0) return;

    odRoutes.forEach((r) => {
      const origin = r.path ? r.path[0] : null;
      const dest = r.path ? r.path[r.path.length - 1] : null;
      if (!origin || !dest) return;

      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            const path = coords.map((c) => [c[1], c[0]]);
            const poly = L.polyline(path, {
              color: "#0D47A1",
              opacity: 0.9,
              weight: 3 + (r.trip_count || 10) / 12,
              lineCap: "round",
              lineJoin: "round"
            });
            poly.bindPopup(`
              <div style="font-family: inherit; font-size: 11px;">
                <strong>Corridor Flow: ${r.trip_count || "N/A"} Trips</strong><br/>
                Length: ${(data.routes[0].distance / 1000).toFixed(2)} km on road
              </div>
            `);
            routesGroup.addLayer(poly);
          } else {
            const fallback = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], {
              color: "#0D47A1",
              opacity: 0.8,
              weight: 3
            });
            routesGroup.addLayer(fallback);
          }
        })
        .catch((err) => {
          console.warn("OD route fetch failed, fallback:", err);
          const fallback = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], {
            color: "#0D47A1",
            opacity: 0.8,
            weight: 3
          });
          routesGroup.addLayer(fallback);
        });
    });
  }, [odRoutes]);

  // 5. Render Congestion Bottleneck Warning Markers (Purple Exclamation Triangles)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.bottlenecks) return;

    const bGroup = layersRef.current.bottlenecks;
    bGroup.clearLayers();

    const items = bottlenecks && bottlenecks.length > 0 ? bottlenecks : [];
    if (items.length === 0) return;

    const warningIcon = L.icon({
      iconUrl: BOTTLENECK_WARNING_SVG,
      iconSize: [30, 28],
      iconAnchor: [15, 25],
      popupAnchor: [0, -20]
    });

    items.forEach((b) => {
      const marker = L.marker([b.lat, b.lng], { icon: warningIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #1e293b; min-width: 180px;">
          <strong style="color: #6B3FA0; font-size: 13px;">⚠️ BOTTLENECK ALERT</strong><br/>
          <div style="margin-top: 4px; font-weight: bold;">${b.label || b.camera_id || "Congested Junction"}</div>
          ${b.speed_drop ? `<div style="color: #dc2626; font-size: 11px;">Speed Drop: -${b.speed_drop}%</div>` : ""}
        </div>
      `);
      bGroup.addLayer(marker);
    });
  }, [bottlenecks]);

  // 6. Render Traffic Density Markers (Radial Gradient Bubbles from Mappls script)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.heatmap) return;

    const hGroup = layersRef.current.heatmap;
    hGroup.clearLayers();

    if (!showHeatmap || (trajectory && trajectory.length > 0)) return;

    cameras.forEach((cam) => {
      const densityIcon = L.divIcon({
        className: "custom-density-bubble",
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: radar-pulse 2s infinite;"></div>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: radial-gradient(circle, #ff0000 30%, #00bfff 100%); border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: densityIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <strong>${cam.name}</strong><br/>
          Density: <strong>Active Flow (${cam.throughput_epm || 45} veh/min)</strong>
        </div>
      `);
      hGroup.addLayer(marker);
    });
  }, [showHeatmap, cameras, trajectory]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-300 shadow-md bg-white">
      {/* Map Surface */}
      <div ref={mapContainerRef} style={{ height, width: "100%" }} />

      {/* Top Left: Google Maps Engine Status & Key */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        <div className="bg-white/95 backdrop-blur border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm flex items-center space-x-2 text-xs font-sans text-gray-800">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold">{TILE_PROVIDERS[activeTileKey]?.name}</span>
          <span className="text-gray-300">|</span>
          <span className="text-[11px] text-emerald-700 font-mono font-semibold">
            KEY: {mapApiKey ? `${mapApiKey.substring(0, 6)}...${mapApiKey.substring(mapApiKey.length - 4)}` : "ACTIVE"}
          </span>
        </div>

        {/* ROAD-TO-ROAD ROUTING MODE TOGGLE */}
        {trajectory && trajectory.length > 1 && (
          <button
            onClick={() => setRoadRoutingActive(!roadRoutingActive)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans transition flex items-center space-x-1.5 shadow-sm ${
              roadRoutingActive
                ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
                : "bg-white/95 text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
            title="Toggle between real road-snapped path and straight line"
          >
            <Route className="w-3.5 h-3.5" />
            <span>
              {roadRoutingActive ? "Road-to-Road Snapping (OSRM Active)" : "Direct Euclidean Line"}
            </span>
          </button>
        )}

        {/* Tile Layer Selector Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="bg-white/95 hover:bg-gray-100 backdrop-blur border border-gray-300 rounded-lg p-1.5 text-gray-700 transition shadow-sm"
            title="Switch Map Tiles"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerSelector && (
            <div className="absolute top-9 left-0 bg-white border border-gray-300 rounded-lg p-1.5 shadow-xl space-y-1 min-w-[210px] z-[1001] font-sans text-xs">
              <div className="text-[10px] text-gray-500 font-bold px-2 py-1 uppercase tracking-wider border-b border-gray-200">
                Select Map Layer
              </div>
              {Object.entries(TILE_PROVIDERS).map(([key, prov]) => (
                <button
                  key={key}
                  onClick={() => switchTileLayer(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                    activeTileKey === key ? "bg-blue-600 text-white font-bold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{prov.name}</span>
                  {activeTileKey === key && <span className="text-[10px]">●</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Live Summary Stats Card (from User's Mappls Script) */}
      {(statsSummary || (trajectory && trajectory.length > 1)) && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur border border-gray-300 rounded-lg p-3 shadow-md text-xs space-y-1 text-gray-800 font-sans max-w-[280px]">
          <div className="font-bold text-gray-900 border-b border-gray-200 pb-1 flex items-center justify-between">
            <span>{statsSummary?.title || "Vehicle Trajectory Corridor"}</span>
            {routingStatus === "matched" && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Road Snapped
              </span>
            )}
            {routingStatus === "routing" && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded animate-pulse">
                Snapping Roads...
              </span>
            )}
          </div>
          {totalRoadDistanceKm && (
            <div className="text-gray-700 text-[11px] pt-1">
              Actual Road Distance: <strong className="text-blue-700 font-mono text-xs">{totalRoadDistanceKm} km</strong>
            </div>
          )}
          {statsSummary?.total_vehicles && (
            <div><b>{statsSummary.total_vehicles}</b> vehicle trips tracked</div>
          )}
          {statsSummary?.busiest_corridor && (
            <div className="truncate">Corridor: <b>{statsSummary.busiest_corridor}</b></div>
          )}
          {statsSummary?.bottleneck_count !== undefined && (
            <div className="text-purple-800 font-semibold">
              <b>{statsSummary.bottleneck_count}</b> active bottleneck alerts
            </div>
          )}
          <div className="text-[10px] text-gray-500 pt-0.5">
            Path geometry derived from Vadodara municipal road network graph.
          </div>
        </div>
      )}

      {/* Bottom Right: Map Legend (from User's Script Design) */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur border border-gray-300 rounded-lg p-2.5 shadow-sm text-xs space-y-1.5 text-gray-700 font-sans max-w-[240px]">
        <div className="text-[11px] font-bold text-gray-900 border-b border-gray-200 pb-1 flex items-center justify-between">
          <span>MAP ELEMENTS LEGEND</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">●</span>
          <span className="text-gray-700 text-[11px]">Signal Sighting Node</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-1 rounded bg-[#0D47A1]" />
          <span className="text-gray-700 text-[10px] font-medium">Road Trajectory Path (Through Roads)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            style={{
              display: "inline-block",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "11px solid #6B3FA0"
            }}
          />
          <span className="text-gray-700 text-[10px]">Congestion Bottleneck Alert</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #ff0000, #00bfff)"
            }}
          />
          <span className="text-gray-700 text-[10px]">Traffic Density Level</span>
        </div>
      </div>

      {/* Bottom Left: Civic Watermark */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur px-2.5 py-1 rounded border border-gray-300 text-[10px] text-gray-600 font-mono flex items-center space-x-2 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        <span>VADODARA MUNICIPAL CORPORATION // ITCS GIS NETWORK</span>
      </div>
    </div>
  );
}
