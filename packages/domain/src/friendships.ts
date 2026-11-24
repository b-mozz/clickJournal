// Friend requests: validation + queries. The acting user's id is always passed
// in by the caller (from currentUserId()), never read from the request body.
// Spec: docs/specs/friends/friendship.md

import { prisma, type Friendship } from "@clickjournal/db";
import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  receiverId: z.string().uuid(),
});

export const friendshipParamsSchema = z.object({
  id: z.string().uuid(),
});

export const respondFriendRequestSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export type FriendshipResult =
  | { ok: true; friendship: Friendship }
  | { ok: false; code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT"; message: string };

// Creates a PENDING request from requesterId to receiverId. Any existing row
// between the two users, in either direction and in any status, is a conflict.
export async function sendFriendRequest(
  requesterId: string,
  receiverId: string
): Promise<FriendshipResult> {
  if (requesterId === receiverId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "You can't friend yourself" };
  }

  const receiver = await prisma.user.findFirst({
    where: { id: receiverId, isActive: true },
    select: { id: true },
  });
  if (!receiver) return { ok: false, code: "NOT_FOUND", message: "User not found" };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, code: "CONFLICT", message: "A friend request already exists" };
  }

  try {
    const friendship = await prisma.friendship.create({ data: { requesterId, receiverId } });
    return { ok: true, friendship };
  } catch (err) {
    // Two identical requests raced past the check above; the unique index caught it.
    if ((err as { code?: string }).code === "P2002") {
      return { ok: false, code: "CONFLICT", message: "A friend request already exists" };
    }
    throw err;
  }
}

// Moves a PENDING request to ACCEPTED or DECLINED. Only the receiver may do
// this; to anyone else the request does not exist.
export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  status: "ACCEPTED" | "DECLINED"
): Promise<FriendshipResult> {
  // The status guard in the WHERE makes the transition atomic: two concurrent
  // responses can't both succeed.
  const { count } = await prisma.friendship.updateMany({
    where: { id: friendshipId, receiverId: userId, status: "PENDING" },
    data: { status, respondedAt: new Date() },
  });

  const friendship = await prisma.friendship.findFirst({
    where: { id: friendshipId, receiverId: userId },
  });
  if (!friendship) return { ok: false, code: "NOT_FOUND", message: "Friend request not found" };
  if (count === 0) {
    return { ok: false, code: "CONFLICT", message: "This request was already answered" };
  }
  return { ok: true, friendship };
}
