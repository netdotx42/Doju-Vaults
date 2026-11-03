import { formatPct } from "@/lib/format";

export const SNAPSHOT_AS_OF = "3 Nov 2026";

export type ApySource = "live" | "snapshot" | "estimate" | "unpublished";

export type Headline = {
  apyNumber: number | null;
  apyText: string;
  caption: string;
  source: ApySource;
};

export function resolveHeadline(input: {
  mode: "pool" | "estimated" | "unpublished";
  prefer30d: boolean;
  venueApy: number | null;
  venueMean: number | null;
  liveApy: number | null;
  liveMean: number | null;
  live: boolean;
}): Headline {
  if (input.mode === "unpublished") {
    return {
      apyNumber: null,
      apyText: "Variable",
      caption: "Not published",
      source: "unpublished",
    };
  }

  if (input.mode === "estimated") {
    if (input.venueApy == null) {
      return {
        apyNumber: null,
        apyText: "Variable",
        caption: "Not published",
        source: "unpublished",
      };
    }
    return {
      apyNumber: input.venueApy,
      apyText: `Est. ${formatPct(input.venueApy)}`,
      caption: "Estimated",
      source: "estimate",
    };
  }

  const spot = input.live && input.liveApy != null ? input.liveApy : input.venueApy;
  const mean = input.live && input.liveMean != null ? input.liveMean : input.venueMean;
  const usedLive = input.live && (input.prefer30d ? input.liveMean != null : input.liveApy != null);
  const value = input.prefer30d ? (mean ?? spot) : (spot ?? mean);
  const fellBack = input.prefer30d && mean == null && spot != null;

  if (value == null) {
    return {
      apyNumber: null,
      apyText: "—",
      caption: "Unavailable",
      source: usedLive ? "live" : "snapshot",
    };
  }

  let caption: string;
  if (fellBack) {
    caption = usedLive ? "30-day average unavailable" : `30-day average unavailable · snapshot ${SNAPSHOT_AS_OF}`;
  } else if (input.prefer30d) {
    caption = usedLive ? "30-day average · live" : `30-day average · snapshot ${SNAPSHOT_AS_OF}`;
  } else {
    caption = usedLive ? "Live" : `Snapshot · ${SNAPSHOT_AS_OF}`;
  }

  return {
    apyNumber: value,
    apyText: formatPct(value),
    caption,
    source: usedLive ? "live" : "snapshot",
  };
}

/** Compounded earnings if the APY stays flat. Not a promise. */
export function compoundedGain(principal: number, apyPct: number, days: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(apyPct) || !Number.isFinite(days) || days <= 0) return 0;
  return principal * (Math.pow(1 + apyPct / 100, days / 365) - 1);
}
