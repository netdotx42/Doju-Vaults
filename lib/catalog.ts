import { VAULTS } from "@/config/vaults";
import { SNAPSHOT_AS_OF, resolveHeadline } from "@/lib/apy";
import { assetFor, RESEARCH_AS_OF, venueFor } from "@/lib/research";
import type { LivePool, MarketData, PricePoint, VaultView } from "@/lib/types";

function n(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildViews(
  livePools: Record<string, LivePool> | null,
  prices: Record<string, PricePoint>,
  feedOk: boolean,
): MarketData {
  const vaults: VaultView[] = VAULTS.map((config) => {
    const asset = assetFor(config.asset);
    const venue = venueFor(config);
    const poolId = venue.defillamaPoolId ?? null;
    const live = poolId && livePools ? livePools[poolId] : undefined;
    const headline = resolveHeadline({
      mode: config.apyMode,
      prefer30d: config.prefer30d,
      venueApy: n(venue.apy),
      venueMean: n(venue.apyMean30d),
      liveApy: live ? n(live.apy) : null,
      liveMean: live ? n(live.apyMean30d) : null,
      live: Boolean(live),
    });
    const spotApy = live ? n(live.apy) ?? n(venue.apy) : n(venue.apy);
    const mean30d = live ? n(live.apyMean30d) ?? n(venue.apyMean30d) : n(venue.apyMean30d);
    const tvlLive = Boolean(live && n(live.tvlUsd) != null);
    const tvlUsd = tvlLive ? n(live?.tvlUsd) : n(venue.tvlUsd);
    const tvlCaption =
      config.tvlNote ??
      (tvlUsd == null ? "Not published" : tvlLive ? "Live TVL" : `Snapshot TVL · ${SNAPSHOT_AS_OF}`);
    const price = prices[asset.mint];
    const note = [venue.note, asset.notes].filter(Boolean).join(" ");
    return {
      slug: config.slug,
      symbol: asset.symbol.replace(" (Hastra)", ""),
      name: asset.name,
      mint: asset.mint,
      decimals: config.decimals,
      category: config.category,
      summary: config.summary,
      risk: config.risk,
      strategy: config.strategy,
      protocol: venue.venue,
      displayOnly: config.displayOnly,
      ilRisk: config.strategy === "lp" || venue.ilRisk === "yes",
      sunset: config.sunset,
      apyText: headline.apyText,
      apyCaption: headline.caption,
      apyNumber: headline.apyNumber,
      apySource: headline.source,
      spotApy,
      mean30d,
      baseApy: live ? n(live.apyBase) ?? n(venue.apyBase) : n(venue.apyBase),
      rewardApy: live ? n(live.apyReward) ?? n(venue.apyReward) : n(venue.apyReward),
      tvlUsd,
      tvlCaption,
      poolId,
      sourceUrl: venue.source ?? null,
      note: note || null,
      feesNote: config.feesNote,
      priceUsd: price?.usd ?? null,
      priceSource: price?.source ?? "none",
      priceChange24h: price?.change24h ?? null,
      aggregate: config.aggregate,
      jupiterFromSol: Boolean(config.jupiterFromSol),
      prefer30d: config.prefer30d,
      iconUrl: null,
      sparkline: [],
      trend: null,
    };
  });

  let tvl = 0;
  let sawTvl = false;
  let weighted = 0;
  let weight = 0;
  for (const vault of vaults) {
    if (vault.aggregate === "none" || vault.tvlUsd == null) continue;
    tvl += vault.tvlUsd;
    sawTvl = true;
    if (vault.aggregate === "both" && vault.apyNumber != null && vault.tvlUsd > 0) {
      weighted += vault.apyNumber * vault.tvlUsd;
      weight += vault.tvlUsd;
    }
  }

  const poolVaults = vaults.filter((vault) => {
    const config = VAULTS.find((item) => item.slug === vault.slug);
    return config?.apyMode === "pool";
  });
  const missingLive = poolVaults.some((vault) => vault.apySource === "snapshot");
  const dataNote = !feedOk
    ? `Snapshot · ${SNAPSHOT_AS_OF}. The live feed did not respond.`
    : missingLive
      ? "Live DefiLlama rates, with snapshots where a pool was missing."
      : "Live from DefiLlama.";

  return {
    vaults,
    aggregate: {
      tvlUsd: sawTvl ? tvl : null,
      apy: weight > 0 ? weighted / weight : null,
    },
    dataNote,
    asOf: RESEARCH_AS_OF,
  };
}
