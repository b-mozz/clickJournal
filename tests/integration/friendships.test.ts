import { describe, it, expect, beforeAll, beforeEach } from "vitest";

// Friend requests against in-memory PGlite. Spec: docs/specs/friends/friendship.md

type PrismaClient = import("@clickjournal/db").PrismaClient;
type Domain = typeof import("@clickjournal/domain");
let prisma: PrismaClient;
let domain: Domain;

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";
const CAROL = "00000000-0000-4000-8000-00000000000c";
const GONE = "00000000-0000-4000-8000-0000000000ff";
const UNKNOWN = "00000000-0000-4000-8000-000000000999";

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  prisma = (await import("@clickjournal/db")).prisma;
  domain = await import("@clickjournal/domain");
}, 30000);

beforeEach(async () => {
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: [
      { id: ALICE, username: "alice", email: "alice@example.com" },
      { id: BOB, username: "bob", email: "bob@example.com" },
      { id: CAROL, username: "carol", email: "carol@example.com" },
      { id: GONE, username: "gone", email: "gone@example.com", isActive: false },
    ],
  });
});

async function pendingAliceToBob() {
  const result = await domain.sendFriendRequest(ALICE, BOB);
  if (!result.ok) throw new Error(`setup failed: ${result.code}`);
  return result.friendship;
}

describe("sendFriendRequest", () => {
  it("creates a PENDING request from the current user", async () => {
    const result = await domain.sendFriendRequest(ALICE, BOB);
    expect(result).toMatchObject({
      ok: true,
      friendship: { requesterId: ALICE, receiverId: BOB, status: "PENDING", respondedAt: null },
    });
    expect(await prisma.friendship.count()).toBe(1);
  });

  it("rejects a request to yourself", async () => {
    expect(await domain.sendFriendRequest(ALICE, ALICE)).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(await prisma.friendship.count()).toBe(0);
  });

  it("returns NOT_FOUND for unknown and deactivated users", async () => {
    expect(await domain.sendFriendRequest(ALICE, UNKNOWN)).toMatchObject({ code: "NOT_FOUND" });
    expect(await domain.sendFriendRequest(ALICE, GONE)).toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.friendship.count()).toBe(0);
  });

  it("rejects a duplicate in the same direction", async () => {
    await pendingAliceToBob();
    expect(await domain.sendFriendRequest(ALICE, BOB)).toMatchObject({ code: "CONFLICT" });
    expect(await prisma.friendship.count()).toBe(1);
  });

  it("rejects a request in the reverse direction", async () => {
    await pendingAliceToBob();
    expect(await domain.sendFriendRequest(BOB, ALICE)).toMatchObject({ code: "CONFLICT" });
    expect(await prisma.friendship.count()).toBe(1);
  });

  it("rejects re-sending after a decline", async () => {
    const { id } = await pendingAliceToBob();
    await domain.respondToFriendRequest(BOB, id, "DECLINED");
    expect(await domain.sendFriendRequest(ALICE, BOB)).toMatchObject({ code: "CONFLICT" });
  });
});

describe("respondToFriendRequest", () => {
  it("lets the receiver accept", async () => {
    const { id } = await pendingAliceToBob();
    const result = await domain.respondToFriendRequest(BOB, id, "ACCEPTED");
    expect(result).toMatchObject({ ok: true, friendship: { id, status: "ACCEPTED" } });

    const row = await prisma.friendship.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("ACCEPTED");
    expect(row.respondedAt).toBeInstanceOf(Date);
  });

  it("lets the receiver decline", async () => {
    const { id } = await pendingAliceToBob();
    expect(await domain.respondToFriendRequest(BOB, id, "DECLINED")).toMatchObject({
      ok: true,
      friendship: { status: "DECLINED" },
    });
  });

  it("returns NOT_FOUND to the requester and to strangers, and changes nothing", async () => {
    const { id } = await pendingAliceToBob();
    expect(await domain.respondToFriendRequest(ALICE, id, "ACCEPTED")).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await domain.respondToFriendRequest(CAROL, id, "ACCEPTED")).toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await prisma.friendship.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  });

  it("returns NOT_FOUND for an unknown id", async () => {
    expect(await domain.respondToFriendRequest(BOB, UNKNOWN, "ACCEPTED")).toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns CONFLICT once the request was answered, keeping the first answer", async () => {
    const { id } = await pendingAliceToBob();
    await domain.respondToFriendRequest(BOB, id, "DECLINED");
    expect(await domain.respondToFriendRequest(BOB, id, "ACCEPTED")).toMatchObject({
      code: "CONFLICT",
    });
    expect((await prisma.friendship.findUniqueOrThrow({ where: { id } })).status).toBe("DECLINED");
  });
});
