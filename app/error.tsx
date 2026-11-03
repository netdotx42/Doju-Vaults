"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" className="mx-auto max-w-lg px-4 py-24">
      <h1 className="text-3xl font-semibold">Something went wrong.</h1>
      <p className="mt-2 text-sm text-neutral-400">The page failed to load. You can try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-full bg-brand px-5 text-sm font-semibold text-black"
      >
        Try again
      </button>
    </main>
  );
}
