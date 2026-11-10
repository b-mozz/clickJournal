"use client";

// NYC map of the current user's posts. Pins are DOM <button> markers so they
// are keyboard-focusable. Spec: docs/specs/map/my-map.md

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { PostCard } from "./PostCard";
import { formatPostDate } from "./format-date";
import { applyMapTheme } from "./map-theme";

export type MapPin = {
  id: string;
  caption: string | null;
  latitude: number;
  longitude: number;
  createdAt: string; // ISO
};

type Bounds = { west: number; south: number; east: number; north: number };

// One base style, repainted by applyMapTheme (same in light and dark mode).
const BASE_STYLE = "https://tiles.openfreemap.org/styles/positron";
const WORKER_PATH = "/maplibre-worker.mjs";

// MapLibre positions a marker by writing `transform` on the marker element, so
// that element (the 44px hit target) must never set transform itself. Only the
// inner frame scales on hover, focus, or while its card is open.
const PIN_BUTTON_CLASS = "group flex size-11 cursor-pointer items-center justify-center rounded-sm";
// A 40px photo frame: white border, crisp shadow, ice tile behind the photo
// (which is all that shows if the photo is missing).
const PIN_FRAME_CLASS =
  "flex size-10 items-center justify-center overflow-hidden rounded-sm border-2 border-white bg-ice shadow-[0_2px_8px_rgb(11_21_32/0.5)] transition-transform duration-150 group-hover:scale-125 group-focus-visible:scale-125 group-aria-pressed:scale-150 motion-reduce:transition-none";

function cameraMark(): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "size-4 text-night/50");
  svg.innerHTML =
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 8h3l2-2.5h6L17 8h3v11H4z"/>' +
    '<circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>';
  return svg;
}

export function MyMap({ pins, bounds }: { pins: MapPin[]; bounds: Bounds }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const pinEls = useRef(new Map<string, HTMLButtonElement>());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MaplibreMap | null = null;
    let cancelled = false;

    // Import on the client only: maplibre needs window and WebGL.
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled) return;
      // Same-origin worker; see app/maplibre-worker.mjs/route.ts.
      if (!maplibregl.getWorkerUrl().endsWith(WORKER_PATH)) {
        maplibregl.setWorkerUrl(new URL(WORKER_PATH, window.location.origin).href);
      }
      const box: [[number, number], [number, number]] = [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ];
      const m = new maplibregl.Map({
        container,
        style: BASE_STYLE,
        bounds: box,
        maxBounds: box,
        attributionControl: { compact: true },
      });
      map = m;
      m.on("style.load", () => applyMapTheme(m));
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      for (const pin of pins) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = PIN_BUTTON_CLASS;
        const frame = document.createElement("span");
        frame.className = PIN_FRAME_CLASS;
        const img = document.createElement("img");
        img.src = `/api/posts/${encodeURIComponent(pin.id)}/photo`;
        img.alt = ""; // the button's aria-label names the pin
        img.loading = "lazy";
        img.decoding = "async";
        img.className = "size-full object-cover";
        // No photo: an empty ice frame with a small camera mark, so it reads as
        // "no photo" rather than a rendering glitch.
        img.addEventListener("error", () => img.replaceWith(cameraMark()), { once: true });
        frame.appendChild(img);
        el.appendChild(frame);
        el.setAttribute("aria-label", `Post from ${formatPostDate(pin.createdAt)}`);
        el.setAttribute("aria-pressed", "false");
        el.addEventListener("click", (e) => {
          e.stopPropagation(); // don't let the map treat it as a pan/click
          openerRef.current = el;
          setSelectedId(pin.id);
        });
        pinEls.current.set(pin.id, el);
        new maplibregl.Marker({ element: el }).setLngLat([pin.longitude, pin.latitude]).addTo(m);
      }

      if (pins.length > 0) {
        const fit = new maplibregl.LngLatBounds();
        for (const p of pins) fit.extend([p.longitude, p.latitude]);
        m.fitBounds(fit, { padding: 80, maxZoom: 15, animate: false });
      }
    });

    return () => {
      cancelled = true;
      pinEls.current.clear();
      map?.remove();
    };
  }, [pins, bounds]);

  // Reflect the open card on its pin.
  useEffect(() => {
    for (const [id, el] of pinEls.current) {
      el.setAttribute("aria-pressed", String(id === selectedId));
      el.style.zIndex = id === selectedId ? "1" : ""; // open pin sits above its neighbors
    }
  }, [selectedId]);

  const selected = pins.find((p) => p.id === selectedId) ?? null;

  const closeCard = useCallback(() => {
    setSelectedId(null);
    openerRef.current?.focus();
  }, []);

  return (
    <>
      {/* MapLibre sets position:relative on its container, so it gets an inner
          div that fills a positioned wrapper instead of being positioned itself. */}
      <div className="absolute inset-0 bg-paper">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {pins.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <p className="rounded-lg bg-paper/90 px-6 py-4 text-center text-2xl font-semibold tracking-[-0.02em] text-ink shadow-md">
            No places yet. Get out there.
          </p>
        </div>
      )}

      {selected && <PostCard key={selected.id} pin={selected} onClose={closeCard} />}
    </>
  );
}
