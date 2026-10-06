"use client";

// Heart button for a post, like Instagram. Talks to /api/posts/[postId]/likes.
// State diagram: docs/specs/posts/like-button.md

import { useEffect, useState } from "react";

type LikeState = { liked: boolean; count: number };
type Status = "loading" | "loadFailed" | "idle" | "saving";

const ERROR_TEXT = "Couldn't update your like. Try again.";

export function LikeButton({ postId }: { postId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [like, setLike] = useState<LikeState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the current like state when the button first appears.
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(`/api/posts/${postId}/likes`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GET likes returned ${res.status}`);
        return res.json() as Promise<LikeState>;
      })
      .then((data) => {
        setLike(data);
        setStatus("idle");
      })
      .catch((err) => {
        if (controller.signal.aborted) return; // component went away; ignore
        console.error(err);
        setStatus("loadFailed");
      });

    return () => controller.abort();
  }, [postId]);

  async function toggle() {
    if (!like || status !== "idle") return;
    setStatus("saving");
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/likes`, {
        method: like.liked ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error(`Like request returned ${res.status}`);
      // Trust the server's answer instead of doing count + 1 ourselves.
      setLike((await res.json()) as LikeState);
    } catch (err) {
      console.error(err);
      setError(ERROR_TEXT); // keep the old like state; nothing changed
    } finally {
      setStatus("idle");
    }
  }

  if (status === "loading") {
    return <span className="text-sm text-neutral-400">Loading likes…</span>;
  }

  if (status === "loadFailed" || !like) {
    return <span className="text-sm text-neutral-500">Likes unavailable</span>;
  }

  // Derived values: computed from state on every render, never stored.
  const isSaving = status === "saving";
  const label = like.liked ? "Unlike this post" : "Like this post";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isSaving}
        aria-pressed={like.liked}
        aria-label={label}
        className="rounded-full px-2 py-1 text-xl disabled:opacity-50"
      >
        {like.liked ? "♥" : "♡"}
      </button>
      <span className="text-sm text-neutral-700">
        {like.count} {like.count === 1 ? "like" : "likes"}
      </span>
      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}