// Likes: validation + queries. Every function takes the current user's id and
// only touches posts that user is allowed to see. Spec: docs/specs/posts/likes.md

import { prisma } from "@clickjournal/db";
import { z } from "zod";

// Route params for /api/posts/[postId]/likes. Post ids are usually uuids, but
// not always (the seed post is "seed-1"), so only require a non-blank id.
export const likeParamsSchema = z.object({
  postId: z.string().trim().min(1).max(100),
});

export type LikeState = { liked: boolean; count: number };

// A post is visible to a user when it is not soft-deleted AND the user wrote it
// or it is PUBLIC. FRIENDS / CLOSE_FRIENDS need the Friendship model, which does
// not exist yet, so those posts are only visible to their author for now.
function visibleToUser(userId: string) {
  return {
    deletedAt: null,
    OR: [{ authorId: userId }, { visibility: "PUBLIC" as const }],
  };
}

function visiblePostWhere(userId: string, postId: string) {
  return { id: postId, ...visibleToUser(userId) };
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

export type PostWithLikes = {
  id: string;
  caption: string | null;
  authorUsername: string;
  createdAt: Date;
  like: LikeState;
};

// Newest posts the user can see, each with its like count and whether this user
// liked it. Always 3 queries, however many posts there are.
export async function listVisiblePostsWithLikes(
  userId: string,
  limit = 20
): Promise<PostWithLikes[]> {
  const posts = await prisma.post.findMany({
    where: visibleToUser(userId),
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, caption: true, createdAt: true, author: { select: { username: true } } },
  });
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const [counts, mine] = await Promise.all([
    prisma.like.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.like.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);

  const countByPost = new Map(counts.map((c) => [c.postId, c._count._all]));
  const likedByMe = new Set(mine.map((m) => m.postId));

  return posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    authorUsername: p.author.username,
    createdAt: p.createdAt,
    like: { liked: likedByMe.has(p.id), count: countByPost.get(p.id) ?? 0 },
  }));
}
