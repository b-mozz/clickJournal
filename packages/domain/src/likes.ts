// Likes: validation + queries. Every function takes the current user's id and
// only touches posts that user is allowed to see. Spec: docs/specs/posts/likes.md

import { prisma } from "@clickjournal/db";
import { z } from "zod";

// Route params for /api/posts/[postId]/likes. Post ids are uuids.
export const likeParamsSchema = z.object({
  postId: z.string().uuid(),
});

export type LikeState = { liked: boolean; count: number };

// A post is visible to a user when it is not soft-deleted AND the user wrote it
// or it is PUBLIC. FRIENDS / CLOSE_FRIENDS need the Friendship model, which does
// not exist yet, so those posts are only visible to their author for now.
function visiblePostWhere(userId: string, postId: string) {
  return {
    id: postId,
    deletedAt: null,
    OR: [{ authorId: userId }, { visibility: "PUBLIC" as const }],
  };
}

async function isVisible(userId: string, postId: string): Promise<boolean> {
  const post = await prisma.post.findFirst({
    where: visiblePostWhere(userId, postId),
    select: { id: true },
  });
  return post !== null;
}

// Returns null when the post is unknown, deleted, or not visible (→ 404).
export async function getLikeState(userId: string, postId: string): Promise<LikeState | null> {
  if (!(await isVisible(userId, postId))) return null;

  const [count, mine] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { postId: true },
    }),
  ]);
  return { liked: mine !== null, count };
}

// Idempotent: liking an already-liked post succeeds and changes nothing.
export async function likePost(userId: string, postId: string): Promise<LikeState | null> {
  if (!(await isVisible(userId, postId))) return null;

  const [, count] = await prisma.$transaction([
    prisma.like.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    }),
    prisma.like.count({ where: { postId } }),
  ]);
  return { liked: true, count };
}

// Idempotent: unliking a post you never liked succeeds and changes nothing.
export async function unlikePost(userId: string, postId: string): Promise<LikeState | null> {
  if (!(await isVisible(userId, postId))) return null;

  const [, count] = await prisma.$transaction([
    prisma.like.deleteMany({ where: { userId, postId } }),
    prisma.like.count({ where: { postId } }),
  ]);
  return { liked: false, count };
}