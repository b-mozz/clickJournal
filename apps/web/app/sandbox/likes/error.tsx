"use client";

// Shown when page.tsx throws (for example, the database is down).
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

export default function LikesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.warn("Posts failed to load", error.digest ?? error.message);
  }, [error]);

  function retry() {
    // refresh() re-runs the server read; reset() clears this error screen.
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Posts</h1>
      <section role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-800">Couldn&apos;t load posts</p>
        <p className="mt-1 text-sm text-red-700">Check your connection and try again.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
