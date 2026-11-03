import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and risks",
  description: "Doju Vaults is unaudited software and is not financial advice.",
};

export default function TermsPage() {
  return (
    <main id="content" className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-neutral-300 sm:px-6">
      <p className="text-sm font-medium text-violet-300">Risks</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Terms and risks</h1>
      <p className="mt-4">
        Doju Vaults is software, not a broker, advisor, or custodian. Nothing here is financial, legal, or tax advice. Yields can change, stop, or be wrong.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">Unaudited program</h2>
      <p className="mt-2">
        The on-chain vault has not been audited. It can lose funds. Do not deposit size you cannot afford to lose. Set an admin and use a fresh program key before mainnet.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">Rates</h2>
      <p className="mt-2">
        Reference APYs and TVLs come from DefiLlama when the feed responds. If it does not, the page shows a snapshot from 3 Nov 2026 and says so. Estimated and unpublished rates are labeled. They are not promises. Some pools are volatile, so the headline is a 30-day average. LP vaults can lose money to impermanent loss.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">Networks</h2>
      <p className="mt-2">
        The app opens on devnet. Devnet deposits create a practice token in your browser. That token is not the mainnet asset. Mainnet transactions require a confirmation step and are never sent silently. Jupiter swaps, when offered, buy the yield-bearing token. They do not deposit into Kamino or Jupiter Lend.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">Restricted assets</h2>
      <p className="mt-2">
        Some real-world assets need KYC or a qualified-purchaser check. Those vaults are display-only. Others, such as USDY, have their own eligibility rules. You are responsible for them.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">Data</h2>
      <p className="mt-2">
        Prices come from Jupiter, then DefiLlama, then the 3 Nov 2026 snapshot. Wallet activity stays in your wallet. A devnet practice mint key is stored in this browser only.
      </p>
    </main>
  );
}
