import { z } from "zod";

export const CreatePost = z.object({
  caption: z.string().trim().max(2200).optional(),
  photoBlobName: z.string().trim().min(1, "Photo is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  visibility: z.enum(["PRIVATE", "CLOSE_FRIENDS", "FRIENDS", "PUBLIC"]).default("PRIVATE"),
});

export type CreatePostInput = z.infer<typeof CreatePost>;