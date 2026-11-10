"use client";

// The card a map pin opens: photo, caption, date, likes.
// Bottom sheet below 768px, side panel from 768px. Spec: docs/specs/map/my-map.md

import { useEffect, useRef, useState } from "react";
import { LikeButton } from "./LikeButton";
import type { MapPin } from "./MyMap";
import { formatPostDate } from "./format-date";

export function PostCard({ pin, onClose }: { pin: MapPin; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const date = formatPostDate(pin.createdAt);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      aria-label={`Post from ${date}`}
      className="absolute inset-x-0 bottom-0 z-10 max-h-[75svh] overflow-y-auto glass rounded-t-lg md:inset-x-auto md:top-4 md:right-4 md:bottom-auto md:w-96 md:max-h-[calc(100svh-2rem)] md:rounded-lg"
    >
      <div className="relative aspect-[4/5] w-full bg-night/60">
        {photoFailed ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Photo unavailable
          </p>
        ) : (
          // Same-origin, user-scoped bytes; next/image optimization isn't needed here.
          <img
            src={`/api/posts/${encodeURIComponent(pin.id)}/photo`}
            alt={pin.caption ?? `Photo from ${date}`}
            className="h-full w-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full glass text-xl hover:bg-white/15"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 p-5">
        {pin.caption && <p className="text-lg leading-snug">{pin.caption}</p>}
        <p className="text-sm text-white/80">
          <time dateTime={pin.createdAt}>{date}</time>
        </p>
        <LikeButton postId={pin.id} />
      </div>
    </section>
  );
}
