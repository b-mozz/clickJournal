// Seed script: creates the demo user and starter data.
// Safe to re-run once the data model exists.
// Run via: pnpm db:seed

import { prisma } from "@clickjournal/db";

async function main() {
  // upsert --> update or insert 
  // with where we first check if "demo-user" exists or not 
  // prisma uses where to decide then run either update or create, we keep update empty because if a row exist we do not wanna change it 
  // NOTE: where needs an unique field --> id, email or username in our case 
  const demo = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", username: "demo", email: "demo@mail.com" }
  })

  await prisma.post.upsert({
    where: { id: "seed-1" },
    update: {},
    create: {
      id: "seed-1",
      authorId: demo.id,
      photoBlobName: "seed/1.jpg",
      latitude: 40.7128,
      longitude: -74.006,
      visibility: "PUBLIC",
    },

  })

  // A few demo-user posts around NYC so /map has pins (docs/specs/map/my-map.md).
  // Their blobs don't exist in Azurite, so the card shows "Photo unavailable".
  const mapPosts = [
    { id: "seed-map-1", caption: "Sunset off the Brooklyn Bridge", latitude: 40.7061, longitude: -73.9969 },
    { id: "seed-map-2", caption: "Bethesda Terrace, Central Park", latitude: 40.774, longitude: -73.9708 },
    { id: "seed-map-3", caption: "High Line, morning", latitude: 40.748, longitude: -74.0048 },
    { id: "seed-map-4", caption: "Domino Park, Williamsburg", latitude: 40.7144, longitude: -73.9682 },
    { id: "seed-map-5", caption: null, latitude: 40.6602, longitude: -73.969 }, // Prospect Park
  ];
  for (const p of mapPosts) {
    await prisma.post.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, authorId: demo.id, photoBlobName: `seed/${p.id}.jpg`, visibility: "PRIVATE" },
    })
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
