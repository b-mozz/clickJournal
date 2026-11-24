// Send a friend request. Spec: docs/specs/friends/friendship.md
//   POST /api/friendships  { receiverId }  → 201 { friendship }
// The requester is always currentUserId(), never the request body.

import { currentUserId } from "@clickjournal/auth";
import { sendFriendRequest, sendFriendRequestSchema } from "@clickjournal/domain";
import { log } from "@clickjournal/log";
import { error, failureResponse } from "./respond";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendFriendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(400, "VALIDATION_ERROR", "receiverId must be a valid id");
  }

  try {
    const userId = await currentUserId();
    const result = await sendFriendRequest(userId, parsed.data.receiverId);
    if (!result.ok) return failureResponse(result);
    return Response.json({ friendship: result.friendship }, { status: 201 });
  } catch (err) {
    log.error({ err }, "send friend request failed");
    return error(500, "INTERNAL_ERROR", "Something went wrong");
  }
}
