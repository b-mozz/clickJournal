// Serves MapLibre's web worker from the installed package, so it always matches
// the maplibre-gl version. MapLibre normally finds the worker next to its own
// script, which doesn't survive Next's bundling. Spec: docs/specs/map/my-map.md
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

// Read from the app's own node_modules (pnpm links direct deps there) rather
// than require.resolve: webpack rewrites require.resolve/createRequire into
// bundled module ids, which readFile can't open.
const WORKER_PATH = path.join(
  process.cwd(),
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
);

export async function GET() {
  const body = await readFile(WORKER_PATH);
  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
