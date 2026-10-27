// Sandbox: posts you can see, each with a like button.
// Spec: docs/specs/posts/likes-screen.md
// The read happens here, on the server: nothing about this list depends on the browser.
import { currentUserId } from "@clickjournal/auth";
import { listVisiblePostsWithLikes } from "@clickjournal/domain";
import Link from "next/link";
import { LikeButton } from "@/components/LikeButton";

export const dynamic = "force-dynamic";

export default async function LikesSandboxPage() {
  const userId = await currentUserId();
  const posts = await listVisiblePostsWithLikes(userId);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Posts</h1>

      {posts.length === 0 ? (
        <section className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="font-medium">No posts to like yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Public posts and your own posts show up here. To add the demo post, run{" "}
            <code className="rounded bg-neutral-100 px-1">pnpm db:seed</code>.
          </p>
          <Link
            href="/sandbox/likes"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Check again
          </Link>
        </section>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="font-medium">{post.caption ?? "Untitled photo"}</p>
              <p className="mb-3 text-sm text-neutral-500">
                by @{post.authorUsername} · {post.createdAt.toLocaleDateString("en-US")}
              </p>
              <LikeButton postId={post.id} initial={post.like} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
