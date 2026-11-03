"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, SECTION_COPY } from "@/config/vaults";
import { Sparkline } from "@/components/sparkline";
import { TokenLogo } from "@/components/token-logo";
import { track } from "@/lib/analytics";
import { formatUsd } from "@/lib/format";
import type { Category, VaultView } from "@/lib/types";

type SortKey = "apy" | "tvl" | "name";
type ViewMode = "grid" | "list";

const RISK: Record<VaultView["risk"], string> = {
  low: "Low",
  medium: "Medium",
  high: "Higher",
  restricted: "Whitelist",
};

const GROUPS: Category[] = ["core", "stable", "rwa", "depin"];

function sortVaults(list: VaultView[], sort: SortKey): VaultView[] {
  return [...list].sort((a, b) => {
    if (sort === "name") return a.symbol.localeCompare(b.symbol);
    if (sort === "tvl") return (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1);
    return (b.apyNumber ?? -1) - (a.apyNumber ?? -1);
  });
}

function trendLabel(vault: VaultView): string {
  if (!vault.trend) return `${vault.symbol} has no 30-day APY line`;
  if (vault.trend === "up") return `${vault.symbol} 30-day APY trend is up`;
  if (vault.trend === "down") return `${vault.symbol} 30-day APY trend is down`;
  return `${vault.symbol} 30-day APY trend is flat`;
}

export function VaultBrowser({ vaults }: { vaults: VaultView[] }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("apy");
  const [view, setView] = useState<ViewMode>("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortVaults(
      vaults.filter((vault) => {
        if (category !== "all" && vault.category !== category) return false;
        if (!q) return true;
        return (
          vault.symbol.toLowerCase().includes(q) ||
          vault.name.toLowerCase().includes(q) ||
          vault.protocol.toLowerCase().includes(q)
        );
      }),
      sort,
    );
  }, [vaults, category, query, sort]);

  const sections =
    category === "all"
      ? GROUPS.map((id) => ({
          id,
          ...SECTION_COPY[id],
          items: filtered.filter((vault) => vault.category === id),
        })).filter((section) => section.items.length > 0)
      : [
          {
            id: category,
            ...SECTION_COPY[category],
            items: filtered,
          },
        ];

  return (
    <section id="vaults" className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Markets</h2>
            <p className="mt-1 text-sm text-neutral-400">Sort the rate, then deposit.</p>
          </div>
          <div className="flex rounded-full border border-neutral-800 p-1" role="group" aria-label="Layout">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                className={`h-11 rounded-full px-3 text-sm font-medium capitalize sm:px-4 ${
                  view === mode ? "bg-violet-400 text-black" : "text-neutral-300"
                }`}
                onClick={() => setView(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Categories">
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
                  active
                    ? "bg-brand text-black"
                    : "border border-violet-400/30 text-neutral-200 hover:border-violet-300"
                }`}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="sr-only">Search vaults</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search token or protocol"
              className="h-11 w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 text-base outline-none focus:border-violet-300"
            />
          </label>
          <label className="text-sm text-neutral-400">
            <span className="sr-only">Sort vaults</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 text-base text-white sm:w-44"
            >
              <option value="apy">Sort by APY</option>
              <option value="tvl">Sort by TVL</option>
              <option value="name">Sort by name</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-neutral-400">No vaults match that search.</p>
      ) : (
        <div className="mt-8 min-w-0 space-y-10">
          {sections.map((section) => (
            <div key={section.id}>
              <header className="mb-4 max-w-2xl">
                <h3
                  className={`text-lg font-semibold ${
                    section.id === "stable" || section.id === "depin" ? "text-violet-300" : "text-brand"
                  }`}
                >
                  {section.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-400">{section.blurb}</p>
              </header>
              {view === "grid" ? (
                <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((vault) => (
                    <li key={vault.slug} className="min-w-0">
                      <VaultCard vault={vault} layout="grid" />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {section.items.map((vault) => (
                    <li key={vault.slug}>
                      <VaultCard vault={vault} layout="list" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VaultCard({ vault, layout }: { vault: VaultView; layout: ViewMode }) {
  const action = vault.displayOnly ? "View" : "Deposit";
  const badges = (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-200">
        {RISK[vault.risk]}
      </span>
      <span className="rounded-full border border-violet-400/40 px-2 py-1 text-xs text-violet-200">
        {formatUsd(vault.tvlUsd)} TVL
      </span>
      {vault.ilRisk ? (
        <span className="rounded-full border border-brand/40 px-2 py-1 text-xs text-brand-bright">IL</span>
      ) : null}
    </div>
  );

  if (layout === "list") {
    return (
      <article className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 transition hover:border-violet-400/70 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TokenLogo symbol={vault.symbol} iconUrl={vault.iconUrl} />
            <div className="min-w-0">
              <Link href={`/vaults/${vault.slug}`} onClick={() => track("open_vault", { slug: vault.slug })} className="font-semibold hover:text-violet-200">
                {vault.symbol}
              </Link>
              <p className="truncate text-sm text-neutral-500">{vault.summary}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 lg:w-40 lg:justify-end">
            <Sparkline values={vault.sparkline} label={trendLabel(vault)} />
          </div>
          <div className="flex items-end justify-between gap-3 lg:w-36 lg:flex-col lg:items-end">
            <p className="text-2xl font-semibold tracking-tight text-brand">{vault.apyText}</p>
            <p className="text-xs text-neutral-500">{vault.apyCaption}</p>
          </div>
          <div className="flex items-center justify-between gap-3 lg:w-56">
            {badges}
            <Link
              href={`/vaults/${vault.slug}`}
              className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-4 text-sm font-semibold text-black"
            >
              {action}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-violet-400/70 hover:shadow-[0_0_32px_rgba(167,139,250,0.12)]">
      <div className="flex items-start gap-3">
        <TokenLogo symbol={vault.symbol} iconUrl={vault.iconUrl} />
        <div className="min-w-0 flex-1">
          <Link href={`/vaults/${vault.slug}`} onClick={() => track("open_vault", { slug: vault.slug })} className="text-lg font-semibold hover:text-violet-200">
            {vault.symbol}
          </Link>
          <p className="truncate text-sm text-neutral-500">{vault.name}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-neutral-400">{vault.summary}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-brand">{vault.apyText}</p>
          <p className="text-xs text-neutral-500">{vault.apyCaption}</p>
        </div>
        <Sparkline values={vault.sparkline} label={trendLabel(vault)} />
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-3">
        {badges}
        <Link
          href={`/vaults/${vault.slug}`}
          className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-black"
        >
          {action}
        </Link>
      </div>
    </article>
  );
}
