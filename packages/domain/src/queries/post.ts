import { prisma } from "@clickJournal/db";
import type { CreatePostInput } from "../schemas/post";

export function listPosts(userId: string) {
  return prisma.post.findMany({
    where: { authorId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export function createPost(userId: string, input: CreatePostInput) {
  return prisma.post.create({ data: { authorId: userId, ...input } });
}