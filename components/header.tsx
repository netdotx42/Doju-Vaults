import Link from "next/link";
import { NetworkBanner } from "@/components/network-banner";
import { WalletButton } from "@/components/wallet-button";

export function Header() {
  return (
    <div className="sticky top-0 z-40">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-brand focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <header className="border-b border-neutral-900 bg-black/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Doju <span className="text-brand">Vaults</span>
            </Link>
            <nav className="mt-1 flex gap-4 text-sm text-neutral-400" aria-label="Primary">
              <Link href="/" className="hover:text-white">
                Vaults
              </Link>
              <Link href="/portfolio" className="hover:text-white">
                Portfolio
              </Link>
              <Link href="/terms" className="hover:text-white">
                Risks
              </Link>
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>
      <NetworkBanner />
    </div>
  );
}
