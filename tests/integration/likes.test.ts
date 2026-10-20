import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// Likes domain queries against in-memory PGlite. Spec: docs/specs/posts/likes.md

type PrismaClient = import("@clickjournal/db").PrismaClient;
type Domain = typeof import("@clickjournal/domain");
let prisma: PrismaClient;
let domain: Domain;

const alice = "alice-id";
const bob = "bob-id";

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  prisma = (await import("@clickjournal/db")).prisma;
  domain = await import("@clickjournal/domain");

  // Posts must have a real author (Post.authorId -> User.id), so create the test users.
  for (const id of [alice, bob]) {
    await prisma.user.upsert({
      where: { id },
      create: { id, username: id, email: `${id}@test.local` },
      update: {},
    });
  }
}, 30000);

beforeEach(async () => {
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
});

async function makePost(
  authorId: string,
  visibility: "PRIVATE" | "FRIENDS" | "CLOSE_FRIENDS" | "PUBLIC" = "PUBLIC",
  deletedAt: Date | null = null
) {
  const post = await prisma.post.create({
    data: { authorId, photoBlobName: "p.jpg", latitude: 0, longitude: 0, visibility, deletedAt },
  });
  return post.id;
}

describe("likes", () => {
  it("likes a public post and reports the new state", async () => {
    const postId = await makePost(alice);
    expect(await domain.likePost(bob, postId)).toEqual({ liked: true, count: 1 });
    expect(await domain.getLikeState(bob, postId)).toEqual({ liked: true, count: 1 });
    expect(await domain.getLikeState(alice, postId)).toEqual({ liked: false, count: 1 });
  });

  it("liking twice is idempotent", async () => {
    const postId = await makePost(alice);
    await domain.likePost(bob, postId);
    expect(await domain.likePost(bob, postId)).toEqual({ liked: true, count: 1 });
  });

  it("unliking removes only the caller's like, and is idempotent", async () => {
    const postId = await makePost(alice);
    await domain.likePost(alice, postId);
    await domain.likePost(bob, postId);
    expect(await domain.unlikePost(bob, postId)).toEqual({ liked: false, count: 1 });
    expect(await domain.unlikePost(bob, postId)).toEqual({ liked: false, count: 1 });
  });

  it("an author can like their own private post", async () => {
    const postId = await makePost(alice, "PRIVATE");
    expect(await domain.likePost(alice, postId)).toEqual({ liked: true, count: 1 });
  });

  it("returns null (404) for another user's private post and writes nothing", async () => {
    const postId = await makePost(alice, "PRIVATE");
    expect(await domain.likePost(bob, postId)).toBeNull();
    expect(await domain.getLikeState(bob, postId)).toBeNull();
    expect(await prisma.like.count()).toBe(0);
  });

  it("returns null (404) for a soft-deleted post", async () => {
    const postId = await makePost(alice, "PUBLIC", new Date());
    expect(await domain.likePost(alice, postId)).toBeNull();
  });

  it("returns null (404) for an unknown post", async () => {
    expect(await domain.getLikeState(bob, randomUUID())).toBeNull();
  });

  it("rejects a malformed postId", () => {
    expect(domain.likeParamsSchema.safeParse({ postId: "not-a-uuid" }).success).toBe(false);
  });
});