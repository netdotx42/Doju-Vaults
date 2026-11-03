import { buildViews } from "@/lib/catalog";
import { SNAPSHOT_PRICES, trackedPoolIds } from "@/lib/research";
import type { ChartPoint, LivePool, MarketData, PricePoint } from "@/lib/types";
import { VAULTS } from "@/config/vaults";
import { assetFor } from "@/lib/research";

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// The full DefiLlama pools file is ~14MB, over Next's 2MB fetch-cache limit.
// Keep a 5-minute copy in the server process and skip the data cache.
let poolMemory: { at: number; ok: boolean; pools: Record<string, LivePool> } | null = null;

export async function fetchLivePools(): Promise<{
  ok: boolean;
  pools: Record<string, LivePool>;
}> {
  if (poolMemory && Date.now() - poolMemory.at < 300_000) {
    return { ok: poolMemory.ok, pools: poolMemory.pools };
  }
  const wanted = new Set(trackedPoolIds());
  try {
    const response = await fetch("https://yields.llama.fi/pools", {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { ok: false, pools: {} };
    const body = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const pools: Record<string, LivePool> = {};
    for (const row of body.data ?? []) {
      const id = typeof row.pool === "string" ? row.pool : "";
      if (!wanted.has(id)) continue;
      pools[id] = {
        apy: num(row.apy),
        apyBase: num(row.apyBase),
        apyReward: num(row.apyReward),
        apyMean30d: num(row.apyMean30d),
        tvlUsd: num(row.tvlUsd),
      };
    }
    poolMemory = { at: Date.now(), ok: true, pools };
    return { ok: true, pools };
  } catch {
    return { ok: false, pools: {} };
  }
}

export async function fetchPrices(): Promise<Record<string, PricePoint>> {
  const mints = [...new Set(VAULTS.map((vault) => assetFor(vault.asset).mint))];
  const book: Record<string, PricePoint> = {};

  try {
    const response = await fetch(
      `https://lite-api.jup.ag/price/v3?ids=${mints.join(",")}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
    );
    if (response.ok) {
      const data = (await response.json()) as Record<
        string,
        { usdPrice?: number; priceChange24h?: number }
      >;
      for (const mint of mints) {
        const usd = num(data[mint]?.usdPrice);
        if (usd == null) continue;
        book[mint] = {
          usd,
          source: "jupiter",
          change24h: num(data[mint]?.priceChange24h),
        };
      }
    }
  } catch {
    // Fall through to the next source.
  }

  const missing = mints.filter((mint) => !book[mint]);
  if (missing.length) {
    try {
      const ids = missing.map((mint) => `solana:${mint}`).join(",");
      const response = await fetch(`https://coins.llama.fi/prices/current/${ids}`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          coins?: Record<string, { price?: number }>;
        };
        for (const mint of missing) {
          const usd = num(data.coins?.[`solana:${mint}`]?.price);
          if (usd == null) continue;
          book[mint] = { usd, source: "defillama", change24h: null };
        }
      }
    } catch {
      // Snapshot fill below.
    }
  }

  for (const mint of mints) {
    if (book[mint] || SNAPSHOT_PRICES[mint] == null) continue;
    book[mint] = {
      usd: SNAPSHOT_PRICES[mint],
      source: "snapshot",
      change24h: null,
    };
  }
  return book;
}

export async function getMarkets(): Promise<MarketData> {
  const [live, prices] = await Promise.all([fetchLivePools(), fetchPrices()]);
  return buildViews(live.ok ? live.pools : null, prices, live.ok);
}

export async function fetchChart(poolId: string): Promise<ChartPoint[]> {
  if (!trackedPoolIds().includes(poolId)) return [];
  try {
    const response = await fetch(`https://yields.llama.fi/chart/${poolId}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      data?: Array<{ timestamp?: string; apy?: number; tvlUsd?: number }>;
    };
    return (body.data ?? [])
      .map((row) => {
        const apy = num(row.apy);
        const tvl = num(row.tvlUsd);
        if (!row.timestamp || apy == null || tvl == null) return null;
        return { t: row.timestamp.slice(0, 10), apy, tvl };
      })
      .filter((row): row is ChartPoint => row != null)
      .slice(-180);
  } catch {
    return [];
  }
}
