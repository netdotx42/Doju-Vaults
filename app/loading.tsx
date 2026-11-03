export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-900" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-neutral-950" />
        <div className="h-28 animate-pulse rounded-2xl bg-neutral-950" />
        <div className="h-28 animate-pulse rounded-2xl bg-neutral-950" />
      </div>
    </main>
  );
}
