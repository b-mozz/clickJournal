// Serves MapLibre's web worker from the installed package, so it always matches
// the maplibre-gl version. MapLibre normally finds the worker next to its own
// script, which doesn't survive Next's bundling. Spec: docs/specs/map/my-map.md
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const dynamic = "force-static";

export async function GET() {
  const file = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
  const body = await readFile(file);
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
