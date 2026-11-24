import { currentUserId } from "@clickjournal/auth";
import CreatePostForm from "./create-post-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await currentUserId();

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">ClickJournal</h1>
        <p className="text-sm text-neutral-500">
          Signed in as{" "}
          <code className="rounded bg-neutral-100 px-1">{userId}</code>{" "}
          (dev identity stub — real auth arrives in Week 8)
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Create a post</h2>
        <CreatePostForm />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <p className="mb-4 text-neutral-600">
          Check whether the database is connected:
        </p>
        <a
          href="/api/health"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
        >
          Check health &rarr;
        </a>
      </section>
    </main>
  );
}