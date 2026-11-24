// Post reads for the map and the photo route. Every function takes the current
// user's id. Specs: docs/specs/map/my-map.md, docs/specs/posts/post-photo.md

import { prisma } from "@clickjournal/db";
import { z } from "zod";
import { visiblePostWhere } from "./visibility";

export const postParamsSchema = z.object({
  postId: z.string().trim().min(1).max(100),
});

// Rough NYC rectangle. Includes slivers of NJ and Nassau by design (see spec).
export const NYC_BOUNDS = {
  west: -74.26,
  south: 40.49,
  east: -73.7,
  north: 40.92,
} as const;

export const MAP_POST_LIMIT = 500;

export type MapPost = {
  id: string;
  caption: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

// The current user's own posts inside NYC, newest first, at most MAP_POST_LIMIT.
export async function listMyMapPosts(userId: string): Promise<MapPost[]> {
  return prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      latitude: { gte: NYC_BOUNDS.south, lte: NYC_BOUNDS.north },
      longitude: { gte: NYC_BOUNDS.west, lte: NYC_BOUNDS.east },
    },
    select: { id: true, caption: true, latitude: true, longitude: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAP_POST_LIMIT,
  });
}

// The blob name of a post the user can see, or null (→ 404) when it is
// unknown, soft-deleted, or not visible. Never send the result to a client.
export async function getVisiblePhotoBlobName(
  userId: string,
  postId: string
): Promise<string | null> {
  const post = await prisma.post.findFirst({
    where: visiblePostWhere(userId, postId),
    select: { photoBlobName: true },
  });
  return post?.photoBlobName ?? null;
}
