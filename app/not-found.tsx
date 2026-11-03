import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="mx-auto max-w-lg px-4 py-24">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="mt-2 text-3xl font-semibold">This page is not a vault.</h1>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-black"
      >
        Back to vaults
      </Link>
    </main>
  );
}
