export type Category = "core" | "stable" | "rwa" | "depin";
export type Risk = "low" | "medium" | "high" | "restricted";
export type Strategy = "lending" | "lst" | "restake" | "dao" | "rwa" | "depin" | "lp";
export type AggregateMode = "both" | "tvl" | "none";
export type ApyMode = "pool" | "estimated" | "unpublished";

export type VaultConfig = {
  slug: string;
  category: Category;
  asset: string;
  venueIndex: number;
  summary: string;
  risk: Risk;
  strategy: Strategy;
  apyMode: ApyMode;
  prefer30d: boolean;
  displayOnly: boolean;
  aggregate: AggregateMode;
  decimals: number;
  feesNote: string;
  tvlNote?: string;
  sunset?: string;
  jupiterFromSol?: boolean;
};

export type LivePool = {
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
  tvlUsd: number | null;
};

export type PricePoint = {
  usd: number;
  source: "jupiter" | "defillama" | "snapshot";
  change24h: number | null;
};

export type ChartPoint = { t: string; apy: number; tvl: number };

export type VaultView = {
  slug: string;
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  category: Category;
  summary: string;
  risk: Risk;
  strategy: Strategy;
  protocol: string;
  displayOnly: boolean;
  ilRisk: boolean;
  sunset?: string;
  apyText: string;
  apyCaption: string;
  apyNumber: number | null;
  apySource: "live" | "snapshot" | "estimate" | "unpublished";
  spotApy: number | null;
  mean30d: number | null;
  baseApy: number | null;
  rewardApy: number | null;
  tvlUsd: number | null;
  tvlCaption: string;
  poolId: string | null;
  sourceUrl: string | null;
  note: string | null;
  feesNote: string;
  priceUsd: number | null;
  priceSource: PricePoint["source"] | "none";
  priceChange24h: number | null;
  aggregate: AggregateMode;
  jupiterFromSol: boolean;
  prefer30d: boolean;
};

export type MarketData = {
  vaults: VaultView[];
  aggregate: { tvlUsd: number | null; apy: number | null };
  dataNote: string;
  asOf: string;
};
