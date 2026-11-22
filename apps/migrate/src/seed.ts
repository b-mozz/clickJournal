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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
