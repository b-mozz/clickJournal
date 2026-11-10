// Repaints OpenFreeMap's positron style as the ClickJournal map, in the landing
// hero's colors: saturated slate-blue land, navy-black water, and ice-white
// accents (shorelines, parks, motorways, towers) that read at every zoom.
// The street grid stays hidden until you zoom deep (STREETS_MIN_ZOOM).
// Spec: docs/specs/design-system.md (Map)

import type { Map as MaplibreMap } from "maplibre-gl";

type PaintProp = Parameters<MaplibreMap["setPaintProperty"]>[1];
type PaintValue = Parameters<MaplibreMap["setPaintProperty"]>[2];
type Paint = Partial<Record<PaintProp, PaintValue>>;

// The hero's slate blues, pushed in saturation, with ice-white accents that
// read at every zoom: shorelines, parks and motorways at city scale, towers
// up close.
export const MAP_PALETTE = {
  land: "#3d6488", // hero slate, saturated
  water: "#0b1520", // hero ink, deepened to navy-black
  ice: "#eaf4ff", // hero sky, icy: shorelines, towers
  park: "#a9cdee", // pale ice blue
  building: "#5583ad",
  tower: "#eaf4ff",
  street: "#5a87b0",
  motorway: "#26476a", // quiet mid-blue: reads on water and on the light relief bands
  label: "#0b1520", // labels sit on the relief, which is mostly light
  labelMuted: "#26476a",
  labelHalo: "#eaf4ff",
  waterLabel: "#6f9cc7",
} as const;

const P = MAP_PALETTE;

// Street grid, rail, street names: only from this zoom (roughly block level).
export const STREETS_MIN_ZOOM = 15;
const TOWER_METERS = 45;

function paintFor(id: string, type: string, sourceLayer: string | undefined): Paint {
  if (type === "background") return { "background-color": P.land };

  if (type === "symbol") {
    if (sourceLayer === "water_name" || sourceLayer === "waterway") {
      return { "text-color": P.waterLabel, "text-halo-color": P.water };
    }
    const major = id === "label_city" || id === "label_city_capital" || id === "label_town";
    return { "text-color": major ? P.label : P.labelMuted, "text-halo-color": P.labelHalo };
  }

  if (sourceLayer === "water") return { "fill-color": P.water };
  if (sourceLayer === "waterway") return { "line-color": P.water };
  // Parks and woods would mask the elevation relief, which is the map's texture.
  if (sourceLayer === "park" || id === "landcover_wood") return { "fill-opacity": 0 };
  if (id === "landuse_residential") return { "fill-opacity": 0 };
  if (sourceLayer === "aeroway") return type === "fill" ? { "fill-color": P.park } : { "line-color": P.park };

  if (sourceLayer === "building") {
    return {
      // Low-rise just lifts off the land; towers catch the light.
      // Low-rise is a translucent white wash so the relief shows through;
      // towers are solid ice.
      "fill-color": [
        "step",
        ["coalesce", ["get", "render_height"], 0],
        "rgba(255, 255, 255, 0.28)",
        TOWER_METERS,
        P.tower,
      ],
      "fill-outline-color": "rgba(0, 0, 0, 0)",
      // Fade in as footprints arrive (zoom 13), so they never pop.
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, 1],
    };
  }

  if (sourceLayer === "transportation") {
    if (type === "fill") return { "fill-color": P.street };
    if (id.includes("casing")) return { "line-color": P.land };
    if (id.includes("motorway")) return { "line-color": P.motorway, "line-opacity": 0.7 };
    return { "line-color": P.street };
  }
  return {};
}

// Layers hidden outright: shields, admin boundaries, POI-ish labels.
function hidden(id: string, sourceLayer: string | undefined) {
  return id.includes("shield") || sourceLayer === "boundary" || id === "airport";
}

// Layers that wait for deep zoom: every street, path and rail line and their
// names. Motorways stay as faint lines at all zooms so bridges keep the
// boroughs connected.
function deepZoomOnly(id: string, sourceLayer: string | undefined) {
  if (sourceLayer === "transportation_name") return true;
  if (sourceLayer !== "transportation") return false;
  return !id.includes("motorway");
}

// A crisp ice-white line along every shoreline, so the city is etched in ice
// at every zoom.
const SHORE_LAYER = "cj-shore-ice";

function addShoreLine(map: MaplibreMap) {
  if (map.getLayer(SHORE_LAYER)) return;
  // Draw it directly above the water fill, under everything else.
  const layers = map.getStyle().layers ?? [];
  const waterIndex = layers.findIndex((l) => l.id === "water");
  const before = waterIndex >= 0 ? layers[waterIndex + 1]?.id : undefined;
  map.addLayer(
    {
      id: SHORE_LAYER,
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["!=", ["get", "brunnel"], "tunnel"],
      paint: {
        "line-color": P.ice,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 2],
        "line-opacity": 0.9,
      },
    },
    before
  );
}

export function applyMapTheme(map: MaplibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;
    if (hidden(layer.id, sourceLayer)) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    if (deepZoomOnly(layer.id, sourceLayer)) {
      map.setLayerZoomRange(layer.id, Math.max(layer.minzoom ?? 0, STREETS_MIN_ZOOM), layer.maxzoom ?? 24);
    }
    for (const [prop, value] of Object.entries(paintFor(layer.id, layer.type, sourceLayer))) {
      map.setPaintProperty(layer.id, prop as PaintProp, value);
    }
  }
  addShoreLine(map);
  addRelief(map);
}

// Elevation relief: every bit of land is colored by height, in hard-edged
// bands, so low-lying shore and higher ground make an organic two-tone
// pattern at every zoom, like a flood map. Data: AWS Terrain Tiles
// (Terrarium encoding, free, no key).
const RELIEF_SOURCE = "cj-terrain";
const RELIEF_LAYER = "cj-relief";

// Elevation bands in meters, low to high. Hard edges come from repeating each
// break point: color A up to the break, color B from just after it.
export const RELIEF_BANDS = [
  { upTo: 3, color: "#3d6488" }, // shoreline lowlands: saturated slate
  { upTo: 10, color: "#7fa8d1" },
  { upTo: 25, color: "#c4dcf2" },
  { upTo: Infinity, color: "#eaf4ff" }, // high ground: ice
] as const;

function reliefColor() {
  const stops: (number | string)[] = [-50, RELIEF_BANDS[0].color];
  for (let i = 0; i < RELIEF_BANDS.length - 1; i++) {
    const band = RELIEF_BANDS[i]!;
    stops.push(band.upTo, band.color, band.upTo + 0.01, RELIEF_BANDS[i + 1]!.color);
  }
  stops.push(500, RELIEF_BANDS[RELIEF_BANDS.length - 1]!.color);
  return ["interpolate", ["linear"], ["elevation"], ...stops];
}

function addRelief(map: MaplibreMap) {
  if (map.getLayer(RELIEF_LAYER)) return;
  if (!map.getSource(RELIEF_SOURCE)) {
    map.addSource(RELIEF_SOURCE, {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      attribution:
        '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a> (Mapzen, AWS Open Data)',
    });
  }
  // Under the water fill, so water keeps its own navy over the relief.
  map.addLayer(
    {
      id: RELIEF_LAYER,
      type: "color-relief",
      source: RELIEF_SOURCE,
      paint: { "color-relief-color": reliefColor() as never },
    },
    "water"
  );
}
