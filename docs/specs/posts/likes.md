---
type: feature
---
# A user can like and unlike a post they can see

## Why
Likes are the lightest way to react to a friend's photo. The post shows how
many likes it has and whether the viewer has liked it, so the heart button
can render its state and toggle it.

## Where it lives
- `packages/db/prisma/schema.prisma` — `Like` model, primary key `(userId, postId)`
- `packages/domain/src/likes.ts` — `likeParamsSchema`, `getLikeState`, `likePost`, `unlikePost`
- `apps/web/app/api/posts/[postId]/likes/route.ts` — HTTP handlers

## Behavior
- `GET /api/posts/:postId/likes` returns `200 { liked, count }` for the current user.
- `POST /api/posts/:postId/likes` records a like for the current user and returns
  `200 { liked: true, count }`. Liking an already-liked post changes nothing and
  returns the same body.
- `DELETE /api/posts/:postId/likes` removes the current user's like and returns
  `200 { liked: false, count }`. Unliking a post the user never liked changes
  nothing and returns the same body.
- The acting user is always `currentUserId()`. The request body is ignored.
- A post is visible to a user when it is not soft-deleted and either the user
  is its author or its visibility is `PUBLIC`. Every handler returns
  `404 NOT_FOUND` for a post that is unknown, soft-deleted, or not visible, and
  writes nothing.
- A `postId` that is not a uuid returns `400 VALIDATION_ERROR`.
- Unexpected failures return `500 INTERNAL_ERROR` and are logged; raw errors
  never reach the client.
- Errors use the shape `{ error: { code, message } }`.
- The write and the returned count run in one transaction, so `count` includes
  the change just made.

## Examples

| State / input | Behavior |
|---|---|
| Bob `POST`s a like on Alice's `PUBLIC` post | `200 { liked: true, count: 1 }` |
| Bob `POST`s the same like again | `200 { liked: true, count: 1 }`, still one row |
| Alice and Bob liked; Bob `DELETE`s | `200 { liked: false, count: 1 }` |
| Bob `DELETE`s a like he doesn't have | `200 { liked: false, count: … }`, nothing removed |
| Alice likes her own `PRIVATE` post | `200 { liked: true, count: 1 }` |
| Bob `POST`s on Alice's `PRIVATE` post | `404 NOT_FOUND`, no row written |
| Any request on a soft-deleted post | `404 NOT_FOUND` |
| `postId` is `abc` | `400 VALIDATION_ERROR` |

## Verify
- `pnpm test` runs `tests/integration/likes.test.ts`.
- With `pnpm dev` running and a post id from the database:
```bash
  curl -X POST   -H "x-user-id: bob" localhost:3000/api/posts/<postId>/likes
  curl           -H "x-user-id: bob" localhost:3000/api/posts/<postId>/likes
  curl -X DELETE -H "x-user-id: bob" localhost:3000/api/posts/<postId>/likes
  curl -X POST   -H "x-user-id: bob" localhost:3000/api/posts/abc/likes   # 400
```

## Constraints & decisions
- Like and unlike are idempotent so a double-tap or a retried request never
  errors and the UI can trust the returned state.
- Not-visible posts return 404, not 403, so existence isn't confirmed to
  users who can't see the post.
- `FRIENDS` and `CLOSE_FRIENDS` posts are visible only to their author until a
  Friendship model exists; the visibility check then grows to include them.
- The response carries a count, not a list of who liked. Listing likers
  needs `Like → User` relations in the schema.

## Out of scope
- `POST_LIKED` notifications — no Notification model exists yet. When it
  does, liking writes the like and the notification in one transaction.
- Listing the users who liked a post, not specified yet.
- Friend-based visibility, owned by a future friendships spec.