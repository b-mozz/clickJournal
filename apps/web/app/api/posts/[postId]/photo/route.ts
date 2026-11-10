// A post's photo. Spec: docs/specs/posts/post-photo.md
//   GET /api/posts/:postId/photo → image bytes (200) or { error } (400/404/500)
// The acting user always comes from currentUserId().

import { currentUserId } from "@clickjournal/auth";
import { getVisiblePhotoBlobName, postParamsSchema } from "@clickjournal/domain";
import { log } from "@clickjournal/log";
import { downloadAttachment } from "@clickjournal/services";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ postId: string }> };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(_req: Request, context: RouteContext) {
  const parsed = postParamsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return error(400, "VALIDATION_ERROR", "postId must be a valid id");
  }

  try {
    const userId = await currentUserId();
    const blobName = await getVisiblePhotoBlobName(userId, parsed.data.postId);
    // Not visible and missing blob share one 404, so callers can't tell them apart.
    const photo = blobName ? await downloadAttachment(blobName) : null;
    if (!photo) return error(404, "NOT_FOUND", "Photo not found");

    // The adapter builds data from a Node Buffer, so it is ArrayBuffer-backed.
    return new Response(photo.data as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    log.error({ err, action: "photo" }, "photo route failed");
    return error(500, "INTERNAL_ERROR", "Something went wrong");
  }
}
