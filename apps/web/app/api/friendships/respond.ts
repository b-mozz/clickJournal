// Shared error responses for the friendship routes. Shape: { error: { code, message } }.

import type { FriendshipResult } from "@clickjournal/domain";

const STATUS = { VALIDATION_ERROR: 400, NOT_FOUND: 404, CONFLICT: 409 } as const;

export function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export function failureResponse(result: Extract<FriendshipResult, { ok: false }>) {
  return error(STATUS[result.code], result.code, result.message);
}
