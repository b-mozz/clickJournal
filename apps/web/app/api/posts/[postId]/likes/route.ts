// Likes on a post. Spec: docs/specs/posts/likes.md
//   GET    /api/posts/:postId/likes  → { liked, count }
//   POST   /api/posts/:postId/likes  → like (idempotent)
//   DELETE /api/posts/:postId/likes  → unlike (idempotent)
// The acting user always comes from currentUserId(), never from the request body.

import { currentUserId } from "@clickjournal/auth";
import {
  getLikeState,
  likeParamsSchema,
  likePost,
  unlikePost,
  type LikeState,
} from "@clickjournal/domain";
import { log } from "@clickjournal/log";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ postId: string }> };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// Shared shape for all three handlers: validate → run query → map result.
async function handle(
  context: RouteContext,
  action: string,
  run: (userId: string, postId: string) => Promise<LikeState | null>
) {
  const parsed = likeParamsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return error(400, "VALIDATION_ERROR", "postId must be a valid id");
  }

  try {
    const userId = await currentUserId();
    const state = await run(userId, parsed.data.postId);
    if (!state) return error(404, "NOT_FOUND", "Post not found");
    return Response.json(state);
  } catch (err) {
    log.error({ err, action }, "likes route failed");
    return error(500, "INTERNAL_ERROR", "Something went wrong");
  }
}

export async function GET(_req: Request, context: RouteContext) {
  return handle(context, "get", getLikeState);
}

export async function POST(_req: Request, context: RouteContext) {
  return handle(context, "like", likePost);
}

export async function DELETE(_req: Request, context: RouteContext) {
  return handle(context, "unlike", unlikePost);
}