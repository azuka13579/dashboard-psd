import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Interpolation, MetricKey, Point } from "../lib/api";
import { C, CLUSTER_COLORS, METRICS, fmtMetric, rampColor, titleCase } from "../lib/theme";

const INDONESIA: [L.LatLngTuple, L.LatLngTuple] = [
  [-11.2, 94.8],
  [6.3, 141.2],
];

type Props = {
  points: Point[];
  colorBy: "cluster" | "metric";
  metric: MetricKey;
  clusterNames: string[];
  provinsi?: string;
  check?: Interpolation;
  checkLoc: { lat: number; lon: number } | null;
  focus: { lat: number; lon: number; label: string } | null;
  onPick: (lat: number, lon: number) => void;
};

function PointsLayer({ points, colorBy, metric, clusterNames }: Pick<Props, "points" | "colorBy" | "metric" | "clusterNames">) {
  const map = useMap();
  const layer = useRef<L.LayerGroup | null>(null);
  const renderer = useMemo(() => L.canvas({ padding: 0.3, tolerance: 4 }), []);

  const [min, max] = useMemo(() => {
    const vals = points.map((p) => p[metric]);
    return [Math.min(...vals), Math.max(...vals)];
  }, [points, metric]);

  useEffect(() => {
    layer.current?.remove();
    const g = L.layerGroup();
    for (const p of points) {
      const fill = colorBy === "cluster" ? CLUSTER_COLORS[p.cluster]! : rampColor(metric, (p[metric] - min) / (max - min || 1));
      L.circleMarker([p.lat, p.lon], {
        renderer,
        radius: 4,
        weight: 0.6,
        color: "#ffffff",
        fillColor: fill,
        fillOpacity: 0.92,
      })
        .bindTooltip(
          `<div style="font-weight:600">${titleCase(p.kecamatan)}</div>
           <div style="color:${C.ink3};margin-bottom:4px">${p.provinsi}</div>
           <div>${METRICS[metric].label}: <b>${fmtMetric(metric, p[metric])}</b></div>
           <div>Zona: ${clusterNames[p.cluster] ?? "-"}</div>
           <div style="color:${C.ink3}">Cuaca: ${p.cuaca}</div>`,
          { className: "map-tip", direction: "top", offset: [0, -4] },
        )
        .addTo(g);
    }
    g.addTo(map);
    layer.current = g;
    return () => {
      g.remove();
    };
  }, [points, colorBy, metric, min, max, map, renderer, clusterNames]);

  return null;
}

function FitBounds({ points, provinsi }: { points: Point[]; provinsi?: string }) {
  const map = useMap();
  const target = useMemo(
    () => (!provinsi || points.length === 0 ? L.latLngBounds(INDONESIA) : L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number])).pad(0.15)),
    [provinsi, points],
  );

  useEffect(() => {
    map.invalidateSize();
    map.flyToBounds(target, { duration: 0.6, maxZoom: 10 });
  }, [target, map]);

  // Saat ukuran kontainer berubah (layout selesai / jendela di-resize), sesuaikan ulang peta.
  useEffect(() => {
    const el = map.getContainer();
    let first = true;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (first) {
        first = false;
        return;
      }
      map.fitBounds(target, { maxZoom: 10 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, target]);
  return null;
}

function CheckLayer({ check, checkLoc }: { check?: Interpolation; checkLoc: Props["checkLoc"] }) {
  const map = useMap();
  useEffect(() => {
    if (!checkLoc) return;
    const g = L.layerGroup();
    if (check) {
      for (const n of check.nearest) {
        L.polyline(
          [
            [checkLoc.lat, checkLoc.lon],
            [n.latitude, n.longitude],
          ],
          { color: C.navy, weight: 1, opacity: 0.25 + n.bobot * 0.75, dashArray: "3 4", interactive: false },
        ).addTo(g);
      }
    }
    L.circleMarker([checkLoc.lat, checkLoc.lon], { radius: 9, color: C.navy, weight: 3, fillColor: "#fff", fillOpacity: 1 }).addTo(g);
    L.circleMarker([checkLoc.lat, checkLoc.lon], { radius: 3.5, stroke: false, fillColor: C.navy, fillOpacity: 1, interactive: false }).addTo(g);
    g.addTo(map);
    return () => {
      g.remove();
    };
  }, [check, checkLoc, map]);
  return null;
}

function FocusLayer({ focus }: { focus: Props["focus"] }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 9), { duration: 0.6 });
    const m = L.circleMarker([focus.lat, focus.lon], { radius: 12, color: C.navy, weight: 2.5, fill: false })
      .bindTooltip(titleCase(focus.label), { permanent: true, direction: "top", offset: [0, -10], className: "map-tip" })
      .addTo(map);
    return () => {
      m.remove();
    };
  }, [focus, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)) });
  return null;
}

export default function MapView(props: Props) {
  return (
    <MapContainer
      bounds={INDONESIA}
      minZoom={4}
      maxBounds={[
        [-20, 85],
        [15, 150],
      ]}
      zoomSnap={0.25}
      className="h-full w-full cursor-crosshair rounded-md"
      preferCanvas
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors"
        maxNativeZoom={16}
      />
      <PointsLayer points={props.points} colorBy={props.colorBy} metric={props.metric} clusterNames={props.clusterNames} />
      <FitBounds points={props.points} provinsi={props.provinsi} />
      <CheckLayer check={props.check} checkLoc={props.checkLoc} />
      <FocusLayer focus={props.focus} />
      <ClickHandler onPick={props.onPick} />
    </MapContainer>
  );
}
