// The signed-in user's NYC map. Spec: docs/specs/map/my-map.md
import { currentUserId } from "@clickjournal/auth";
import { listMyMapPosts, NYC_BOUNDS } from "@clickjournal/domain";
import type { Metadata } from "next";
import Link from "next/link";
import { MyMap, type MapPin } from "../../components/MyMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My map · ClickJournal" };

export default async function MapPage() {
  const userId = await currentUserId();
  const posts = await listMyMapPosts(userId);

  // Only serializable map fields cross to the client; the blob name never does.
  const pins: MapPin[] = posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    latitude: p.latitude,
    longitude: p.longitude,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <main className="relative h-svh w-full overflow-hidden">
      {/* Floating glass pill: first in tab order. Shows where you are in the app and how much you've explored. */}
      <header className="glass absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full py-1 pr-4 pl-1 text-sm">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full px-4 text-xs font-medium uppercase tracking-[0.25em] hover:bg-white/10"
        >
          ClickJournal
        </Link>
        <span aria-hidden className="h-4 w-px bg-white/25" />
        <p className="pl-3 whitespace-nowrap text-white/80">
          {pins.length} {pins.length === 1 ? "place" : "places"}
        </p>
      </header>
      <MyMap pins={pins} bounds={NYC_BOUNDS} />
    </main>
  );
}
