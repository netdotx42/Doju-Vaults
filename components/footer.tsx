import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Not financial advice. The program is unaudited.</p>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-white">
            Terms and risks
          </Link>
          <a href="https://defillama.com/yields" className="hover:text-white">
            DefiLlama
          </a>
        </div>
      </div>
    </footer>
  );
}
