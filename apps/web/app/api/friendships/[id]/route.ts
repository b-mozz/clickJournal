// Accept or decline a friend request. Spec: docs/specs/friends/friendship.md
//   PATCH /api/friendships/:id  { status: "ACCEPTED" | "DECLINED" }  → 200 { friendship }
// Only the receiver can respond; anyone else gets 404.

import { currentUserId } from "@clickjournal/auth";
import {
  friendshipParamsSchema,
  respondFriendRequestSchema,
  respondToFriendRequest,
} from "@clickjournal/domain";
import { log } from "@clickjournal/log";
import { error, failureResponse } from "../respond";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const params = friendshipParamsSchema.safeParse(await context.params);
  if (!params.success) return error(400, "VALIDATION_ERROR", "id must be a valid id");

  const body = respondFriendRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return error(400, "VALIDATION_ERROR", 'status must be "ACCEPTED" or "DECLINED"');
  }

  try {
    const userId = await currentUserId();
    const result = await respondToFriendRequest(userId, params.data.id, body.data.status);
    if (!result.ok) return failureResponse(result);
    return Response.json({ friendship: result.friendship });
  } catch (err) {
    log.error({ err }, "respond to friend request failed");
    return error(500, "INTERNAL_ERROR", "Something went wrong");
  }
}
