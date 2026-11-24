"use client";

// Heart button for a post. Talks to /api/posts/[postId]/likes.
// State diagram: docs/specs/posts/like-button.md

import { useEffect, useRef, useState } from "react";

type LikeState = { liked: boolean; count: number };
type Status = "loading" | "loadFailed" | "idle" | "saving" | "saveFailed";

// A request that hasn't answered after this long counts as failed,
// so the button can never stay "saving" forever.
const TIMEOUT_MS = 8000;

export function LikeButton({ postId, initial }: { postId: string; initial?: LikeState }) {
  // With `initial` (the page already read it on the server) there's nothing to load.
  const [status, setStatus] = useState<Status>(initial ? "idle" : "loading");
  const [like, setLike] = useState<LikeState | null>(initial ?? null);
  // Which action failed, so "Try again" repeats exactly that one.
  const [failedAction, setFailedAction] = useState<"like" | "unlike" | null>(null);
  // Blocks a second request even if two clicks land before React re-renders.
  const inFlight = useRef(false);

  async function load(signal?: AbortSignal) {
    setStatus("loading");
    try {
      const res = await fetch(`/api/posts/${postId}/likes`, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
          : AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`GET likes returned ${res.status}`);
      setLike((await res.json()) as LikeState);
      setStatus("idle");
    } catch (err) {
      if (signal?.aborted) return; // component went away; ignore
      console.warn(err);
      setStatus("loadFailed");
    }
  }

  // Only fetch on our own when the page didn't hand us the state.
  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function save(action: "like" | "unlike") {
    if (inFlight.current) return; // a request is already on its way
    inFlight.current = true;
    setStatus("saving");
    setFailedAction(null);

    try {
      const res = await fetch(`/api/posts/${postId}/likes`, {
        method: action === "like" ? "POST" : "DELETE",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Like request returned ${res.status}`);
      // Trust the server's answer instead of doing count + 1 ourselves.
      setLike((await res.json()) as LikeState);
      setStatus("idle");
    } catch (err) {
      console.warn(err);
      setFailedAction(action); // keep the old heart + count; nothing changed
      setStatus("saveFailed");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "loading") {
    return <span className="text-sm text-neutral-400">Loading likes…</span>;
  }

  if (status === "loadFailed" || !like) {
    return (
      <span className="flex items-center gap-2 text-sm text-neutral-500">
        Likes unavailable
        <button type="button" onClick={() => load()} className="underline">
          Try again
        </button>
      </span>
    );
  }

  // Derived values: computed from state on every render, never stored.
  const isSaving = status === "saving";
  const label = like.liked ? "Unlike this post" : "Like this post";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => save(like.liked ? "unlike" : "like")}
        // aria-disabled (not disabled) keeps keyboard focus on the button while saving.
        aria-disabled={isSaving}
        aria-pressed={like.liked}
        aria-label={label}
        className="rounded-full px-2 py-1 text-xl aria-disabled:cursor-wait aria-disabled:opacity-50"
      >
        {like.liked ? "♥" : "♡"}
      </button>
      <span className="text-sm text-neutral-700">
        {like.count} {like.count === 1 ? "like" : "likes"}
      </span>
      {status === "saveFailed" && failedAction && (
        <span role="alert" className="flex items-center gap-2 text-sm text-red-600">
          Couldn&apos;t save your {failedAction}.
          <button type="button" onClick={() => save(failedAction)} className="underline">
            Try again
          </button>
        </span>
      )}
    </div>
  );
}
