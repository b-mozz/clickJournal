import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// Map + photo domain queries against in-memory PGlite.
// Specs: docs/specs/map/my-map.md, docs/specs/posts/post-photo.md

type PrismaClient = import("@clickjournal/db").PrismaClient;
type Domain = typeof import("@clickjournal/domain");
let prisma: PrismaClient;
let domain: Domain;

const alice = "alice-map";
const bob = "bob-map";
const MANHATTAN = { latitude: 40.758, longitude: -73.9855 };

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  prisma = (await import("@clickjournal/db")).prisma;
  domain = await import("@clickjournal/domain");
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

type PostOpts = {
  authorId?: string;
  latitude?: number;
  longitude?: number;
  visibility?: "PRIVATE" | "FRIENDS" | "CLOSE_FRIENDS" | "PUBLIC";
  deletedAt?: Date | null;
  createdAt?: Date;
  photoBlobName?: string;
};

async function makePost(opts: PostOpts = {}) {
  const post = await prisma.post.create({
    data: {
      authorId: opts.authorId ?? alice,
      photoBlobName: opts.photoBlobName ?? "p.jpg",
      latitude: opts.latitude ?? MANHATTAN.latitude,
      longitude: opts.longitude ?? MANHATTAN.longitude,
      visibility: opts.visibility ?? "PRIVATE",
      deletedAt: opts.deletedAt ?? null,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    },
  });
  return post.id;
}

describe("listMyMapPosts", () => {
  it("returns only the caller's posts, not another user's public post", async () => {
    const mine = await makePost();
    await makePost({ authorId: bob, visibility: "PUBLIC" });
    const posts = await domain.listMyMapPosts(alice);
    expect(posts.map((p) => p.id)).toEqual([mine]);
  });

  it("returns only map fields, never the blob name", async () => {
    await makePost({ photoBlobName: "secret/blob.jpg" });
    const [post] = await domain.listMyMapPosts(alice);
    expect(Object.keys(post!).sort()).toEqual(["caption", "createdAt", "id", "latitude", "longitude"]);
  });

  it("excludes soft-deleted posts", async () => {
    await makePost({ deletedAt: new Date() });
    expect(await domain.listMyMapPosts(alice)).toEqual([]);
  });

  it("excludes posts outside the NYC box, keeps posts on its edge", async () => {
    await makePost({ latitude: 34.05, longitude: -118.24 }); // LA
    await makePost({ latitude: 40.95, longitude: -73.9 }); // just north
    await makePost({ latitude: 40.7, longitude: -74.3 }); // just west
    const edge = await makePost({
      latitude: domain.NYC_BOUNDS.south,
      longitude: domain.NYC_BOUNDS.west,
    });
    expect((await domain.listMyMapPosts(alice)).map((p) => p.id)).toEqual([edge]);
  });

  it("orders newest first", async () => {
    const old = await makePost({ createdAt: new Date("2026-01-01") });
    const recent = await makePost({ createdAt: new Date("2026-06-01") });
    expect((await domain.listMyMapPosts(alice)).map((p) => p.id)).toEqual([recent, old]);
  });

  it("caps at MAP_POST_LIMIT, keeping the newest", async () => {
    const base = Date.UTC(2026, 0, 1);
    await prisma.post.createMany({
      data: Array.from({ length: domain.MAP_POST_LIMIT + 1 }, (_, i) => ({
        id: `cap-${i}`,
        authorId: alice,
        photoBlobName: "p.jpg",
        ...MANHATTAN,
        createdAt: new Date(base + i * 1000),
      })),
    });
    const posts = await domain.listMyMapPosts(alice);
    expect(posts).toHaveLength(domain.MAP_POST_LIMIT);
    expect(posts.map((p) => p.id)).not.toContain("cap-0"); // the oldest is dropped
    expect(posts[0]!.id).toBe(`cap-${domain.MAP_POST_LIMIT}`);
  });
});

describe("getVisiblePhotoBlobName", () => {
  it("returns the blob name for the author's own private post", async () => {
    const id = await makePost({ photoBlobName: "a/1.jpg" });
    expect(await domain.getVisiblePhotoBlobName(alice, id)).toBe("a/1.jpg");
  });

  it("returns the blob name for another user's public post", async () => {
    const id = await makePost({ visibility: "PUBLIC", photoBlobName: "a/2.jpg" });
    expect(await domain.getVisiblePhotoBlobName(bob, id)).toBe("a/2.jpg");
  });

  it("returns null for another user's private or friends-only post", async () => {
    const priv = await makePost({ visibility: "PRIVATE" });
    const friends = await makePost({ visibility: "FRIENDS" });
    expect(await domain.getVisiblePhotoBlobName(bob, priv)).toBeNull();
    expect(await domain.getVisiblePhotoBlobName(bob, friends)).toBeNull();
  });

  it("returns null for a soft-deleted post, even for its author", async () => {
    const id = await makePost({ visibility: "PUBLIC", deletedAt: new Date() });
    expect(await domain.getVisiblePhotoBlobName(alice, id)).toBeNull();
  });

  it("returns null for an unknown post", async () => {
    expect(await domain.getVisiblePhotoBlobName(alice, randomUUID())).toBeNull();
  });

  it("postParamsSchema rejects a blank id and accepts a non-uuid id", () => {
    expect(domain.postParamsSchema.safeParse({ postId: "  " }).success).toBe(false);
    expect(domain.postParamsSchema.safeParse({ postId: "seed-1" }).success).toBe(true);
  });
});
