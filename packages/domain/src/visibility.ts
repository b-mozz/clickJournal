// The one rule for "can this user see this post". Shared by likes and photos.
// Specs: docs/specs/posts/likes.md, docs/specs/posts/post-photo.md

// A post is visible to a user when it is not soft-deleted AND the user wrote it
// or it is PUBLIC. FRIENDS / CLOSE_FRIENDS need the Friendship model, which does
// not exist yet, so those posts are only visible to their author for now.
export function visiblePostWhere(userId: string, postId: string) {
  return {
    id: postId,
    deletedAt: null,
    OR: [{ authorId: userId }, { visibility: "PUBLIC" as const }],
  };
}
