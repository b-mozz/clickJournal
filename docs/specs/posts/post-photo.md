---
type: feature
---
# A user can fetch the photo of a post they can see

## Why
A post is a photo taken at a place. Photos live in blob storage, not the
database, so the browser needs one user-scoped URL per post to show the
image.

## Where it lives
- `packages/domain/src/visibility.ts`: `visiblePostWhere`, the visibility
  rule also used by likes ([likes.md](likes.md))
- `packages/domain/src/posts.ts`: `postParamsSchema`, `getVisiblePhotoBlobName`
- `apps/web/app/api/posts/[postId]/photo/route.ts`: the HTTP handler
- Blob reads go through `downloadAttachment` in `@clickjournal/services`

## Behavior
- `GET /api/posts/:postId/photo` returns `200` with the photo's bytes and its
  stored `Content-Type`, plus `Cache-Control: private, max-age=300`.
- The acting user is always `currentUserId()`.
- Visibility is the same rule as likes: the post is not soft-deleted and the
  user is its author or its visibility is `PUBLIC`.
- An unknown, soft-deleted or not-visible post returns `404 NOT_FOUND`.
- A visible post whose blob is missing also returns `404 NOT_FOUND`, so a
  client can't tell "no access" from "no file".
- A blank `postId` returns `400 VALIDATION_ERROR`. Otherwise the rule is
  the same as likes: any non-blank id up to 100 characters.
- Unexpected failures return `500 INTERNAL_ERROR` and are logged.
- Errors use the shape `{ error: { code, message } }`. The blob name never
  appears in a response.

## Examples

| State / input | Behavior |
|---|---|
| Author requests their own post's photo, blob exists | 200, image bytes, stored content type |
| Another user requests a `PUBLIC` post's photo | 200 |
| Another user requests a `PRIVATE` post's photo | 404 `NOT_FOUND` |
| Soft-deleted post | 404 `NOT_FOUND` |
| Visible post, blob missing in storage | 404 `NOT_FOUND` |
| `postId` is whitespace | 400 `VALIDATION_ERROR` |

## Verify
- `pnpm test:integration` (`tests/integration/map-posts.test.ts` covers
  `getVisiblePhotoBlobName`) and the existing `likes.test.ts` both pass.
- With `pnpm dev` running, `curl -i localhost:3000/api/posts/seed-1/photo`
  returns 404 with the JSON error shape, because the seed blob does not
  exist.
- `curl -i -H 'x-user-id: someone-else' localhost:3000/api/posts/<a PRIVATE post id>/photo`
  returns 404.

## Constraints & decisions
- The route streams the original blob. No resizing, because photos are
  capped at 5 MB by storage (`MAX_ATTACHMENT_BYTES`).
- The cache is `private`, because the response depends on who is asking,
  so shared caches must not store it.
- A missing blob returns 404, not 500. That keeps the card's "Photo
  unavailable" fallback a single code path.

## Out of scope
- Uploading photos. There is no spec yet.
- Thumbnails and signed or CDN URLs. There is no spec yet.
