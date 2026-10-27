// Shown while page.tsx is reading posts on the server.
export default function Loading() {
  return (
    <main className="space-y-6" aria-busy="true">
      <h1 className="text-2xl font-bold">Posts</h1>
      <p className="sr-only">Loading posts…</p>
      <ul className="space-y-4">
        {[0, 1, 2].map((i) => (
          <li key={i} className="animate-pulse rounded-lg border border-neutral-200 p-4">
            <div className="h-4 w-1/2 rounded bg-neutral-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-neutral-100" />
            <div className="mt-4 h-6 w-20 rounded bg-neutral-100" />
          </li>
        ))}
      </ul>
    </main>
  );
}
