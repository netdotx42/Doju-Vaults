import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApyChart } from "@/components/apy-chart";
import { DepositPanel } from "@/components/deposit-panel";
import { TokenLogo } from "@/components/token-logo";
import { VAULTS } from "@/config/vaults";
import { formatPct, formatUsd } from "@/lib/format";
import { fetchChart, getMarkets } from "@/lib/live";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vault = VAULTS.find((item) => item.slug === slug);
  return {
    title: vault ? `${vault.asset} vault` : "Vault",
    description: vault?.summary,
  };
}

export default async function VaultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getMarkets();
  const vault = data.vaults.find((item) => item.slug === slug);
  if (!vault) notFound();
  const chart = vault.poolId ? await fetchChart(vault.poolId) : [];
  const priceLabel =
    vault.priceSource === "jupiter"
      ? "Jupiter"
      : vault.priceSource === "defillama"
        ? "DefiLlama"
        : vault.priceSource === "snapshot"
          ? "Snapshot · 3 Nov 2026"
          : "Unavailable";

  return (
    <main id="content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/#vaults" className="text-sm text-violet-300">
        All vaults
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <TokenLogo symbol={vault.symbol} iconUrl={vault.iconUrl} size={48} />
          <div>
            <p className="text-sm uppercase tracking-wide text-violet-300">{vault.category}</p>
            <h1 className="mt-1 text-4xl font-semibold">{vault.symbol}</h1>
            <p className="text-neutral-400">{vault.name}</p>
          </div>
        </div>
        <p className="text-4xl font-semibold text-brand">{vault.apyText}</p>
      </div>
      <p className="mt-2 text-sm text-neutral-500">{vault.apyCaption}</p>
      <p className="mt-4 max-w-2xl text-neutral-300">{vault.summary}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="order-2 space-y-4 lg:order-1">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl border border-neutral-800 p-3">
              <dt className="text-neutral-500">TVL</dt>
              <dd className="mt-1 font-medium">{formatUsd(vault.tvlUsd)}</dd>
              <dd className="text-xs text-neutral-500">{vault.tvlCaption}</dd>
            </div>
            <div className="rounded-2xl border border-neutral-800 p-3">
              <dt className="text-neutral-500">30-day avg</dt>
              <dd className="mt-1 font-medium">{vault.mean30d == null ? "—" : formatPct(vault.mean30d)}</dd>
            </div>
            <div className="rounded-2xl border border-neutral-800 p-3">
              <dt className="text-neutral-500">Spot</dt>
              <dd className="mt-1 font-medium">{vault.spotApy == null ? "—" : formatPct(vault.spotApy)}</dd>
            </div>
            <div className="rounded-2xl border border-neutral-800 p-3">
              <dt className="text-neutral-500">Price</dt>
              <dd className="mt-1 font-medium">
                {vault.priceUsd == null ? "—" : `$${vault.priceUsd < 1 ? vault.priceUsd.toPrecision(3) : vault.priceUsd.toFixed(2)}`}
              </dd>
              <dd className="text-xs text-neutral-500">{priceLabel}</dd>
            </div>
          </dl>
          <ApyChart
            points={chart}
            caption={vault.prefer30d ? "Daily APY. The headline uses the 30-day average." : "Daily APY"}
          />
          <section className="rounded-2xl border border-neutral-800 p-4 text-sm leading-relaxed text-neutral-300">
            <h2 className="font-semibold text-white">Strategy</h2>
            <p className="mt-2">{vault.protocol}</p>
            <p className="mt-2">
              Risk: {vault.risk}. {vault.ilRisk ? "This venue has impermanent loss." : "No impermanent loss on the reference venue."}
            </p>
            {vault.baseApy != null || vault.rewardApy != null ? (
              <p className="mt-2">
                Base {vault.baseApy == null ? "—" : formatPct(vault.baseApy)}
                {vault.rewardApy != null ? ` · rewards ${formatPct(vault.rewardApy)}` : ""}
              </p>
            ) : null}
            <p className="mt-2">{vault.feesNote}</p>
            {vault.sunset ? <p className="mt-2 text-brand">{vault.sunset}</p> : null}
            {vault.note ? <p className="mt-2 text-neutral-500">{vault.note}</p> : null}
            {vault.sourceUrl ? (
              <a className="mt-3 inline-block text-brand" href={vault.sourceUrl}>
                Rate source
              </a>
            ) : null}
          </section>
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-36 lg:self-start">
          <DepositPanel vault={vault} />
        </div>
      </div>
    </main>
  );
}
