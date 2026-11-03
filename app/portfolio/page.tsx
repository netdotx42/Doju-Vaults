import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio-view";
import { getMarkets } from "@/lib/live";

export const metadata: Metadata = { title: "Portfolio" };
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const data = await getMarkets();
  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-violet-300">Wallet</p>
      <h1 className="mt-2 text-3xl font-semibold">Portfolio</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Wallet balances for vault assets, plus Doju share positions on the connected network.
      </p>
      <div className="mt-6">
        <PortfolioView vaults={data.vaults} />
      </div>
    </main>
  );
}
