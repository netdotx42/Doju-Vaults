import { VaultBrowser } from "@/components/vault-browser";
import { WalletButton } from "@/components/wallet-button";
import { formatPct, formatUsd } from "@/lib/format";
import { getMarkets } from "@/lib/live";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getMarkets();
  return (
    <main id="content">
      <section className="relative overflow-hidden border-b border-violet-500/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-medium tracking-[0.18em] text-violet-300">DOJU</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Solana yield, plainly.
          </h1>
          <p className="mt-4 max-w-xl text-neutral-400">
            Core assets, stables, real-world assets, and DePIN. Every rate says if it is live, a snapshot, or an estimate.
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-neutral-500">Reference TVL</dt>
              <dd className="mt-1 text-xl font-semibold sm:text-2xl">{formatUsd(data.aggregate.tvlUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Weighted APY</dt>
              <dd className="mt-1 text-xl font-semibold text-brand sm:text-2xl">
                {data.aggregate.apy == null ? "—" : formatPct(data.aggregate.apy)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Vaults</dt>
              <dd className="mt-1 text-xl font-semibold sm:text-2xl">{data.vaults.length}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-neutral-500">{data.dataNote} Not assets held by Doju.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <WalletButton />
            <a
              href="#vaults"
              className="inline-flex h-11 items-center rounded-full border border-neutral-700 px-4 text-sm"
            >
              Browse vaults
            </a>
          </div>
          <ol className="mt-10 grid gap-3 text-sm text-neutral-300 sm:grid-cols-3">
            <li className="rounded-2xl border border-neutral-900 p-4">
              <span className="text-brand">1</span> Connect Phantom, Solflare, or Backpack.
            </li>
            <li className="rounded-2xl border border-violet-500/30 p-4">
              <span className="text-violet-300">2</span> Pick a vault and read the rate label.
            </li>
            <li className="rounded-2xl border border-neutral-900 p-4">
              <span className="text-brand">3</span> Deposit or withdraw. Mainnet asks first.
            </li>
          </ol>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-8 hidden h-48 w-48 rounded-full border border-violet-400/50 sm:block sm:h-72 sm:w-72"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 top-20 hidden h-36 w-36 rounded-full border border-brand/70 sm:block sm:h-48 sm:w-48"
        />
      </section>
      <VaultBrowser vaults={data.vaults} />
    </main>
  );
}
