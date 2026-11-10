// The signed-in user's NYC map. Spec: docs/specs/map/my-map.md
import { currentUserId } from "@clickjournal/auth";
import { listMyMapPosts, NYC_BOUNDS } from "@clickjournal/domain";
import type { Metadata } from "next";
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
      <MyMap pins={pins} bounds={NYC_BOUNDS} />
    </main>
  );
}
