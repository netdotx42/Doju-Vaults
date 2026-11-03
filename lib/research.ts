import raw from "@/data/yield-research.json";
import { VAULTS } from "@/config/vaults";
import type { VaultConfig } from "@/lib/types";

export type ResearchVenue = {
  venue: string;
  defillamaPoolId?: string | null;
  apyBase?: number | null;
  apyReward?: number | null;
  apy?: number | null;
  apyMean30d?: number | null;
  tvlUsd?: number | null;
  ilRisk?: string | null;
  source?: string;
  note?: string;
};

export type ResearchAsset = {
  symbol: string;
  name: string;
  mint: string;
  notes?: string;
  venues: ResearchVenue[];
};

type ResearchFile = {
  asOf: string;
  core: ResearchAsset[];
  stablecoins: ResearchAsset[];
  rwa: ResearchAsset[];
  depin: ResearchAsset[];
  spotPricesUsdAtResearch: Record<string, number>;
};

const research = raw as unknown as ResearchFile;

export const RESEARCH_AS_OF = research.asOf;
export const SNAPSHOT_PRICES = research.spotPricesUsdAtResearch;

const ASSETS: ResearchAsset[] = [
  ...research.core,
  ...research.stablecoins,
  ...research.rwa,
  ...research.depin,
];

export function assetFor(symbol: string): ResearchAsset {
  const hit = ASSETS.find((asset) => asset.symbol === symbol);
  if (!hit) throw new Error(`Unknown research asset ${symbol}`);
  return hit;
}

export function venueFor(vault: VaultConfig): ResearchVenue {
  const venue = assetFor(vault.asset).venues[vault.venueIndex];
  if (!venue) throw new Error(`Missing venue for ${vault.slug}`);
  return venue;
}

export function trackedPoolIds(): string[] {
  const ids = new Set<string>();
  for (const vault of VAULTS) {
    const id = venueFor(vault).defillamaPoolId;
    if (id) ids.add(id);
  }
  return [...ids];
}

export function jupiterOutputMints(): string[] {
  return VAULTS.filter((vault) => vault.jupiterFromSol).map((vault) => assetFor(vault.asset).mint);
}
