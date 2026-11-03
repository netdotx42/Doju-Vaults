"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/config/vaults";
import { formatUsd } from "@/lib/format";
import type { VaultView } from "@/lib/types";
import { track } from "@/lib/analytics";

const RISK: Record<VaultView["risk"], string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "Higher risk",
  restricted: "Whitelist",
};

export function VaultBrowser({ vaults }: { vaults: VaultView[] }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vaults.filter((vault) => {
      if (category !== "all" && vault.category !== category) return false;
      if (!q) return true;
      return (
        vault.symbol.toLowerCase().includes(q) ||
        vault.name.toLowerCase().includes(q) ||
        vault.protocol.toLowerCase().includes(q)
      );
    });
  }, [vaults, category, query]);

  return (
    <section id="vaults" className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Categories">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
                category === item.id ? "bg-brand text-black" : "border border-neutral-800 text-neutral-300"
              }`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="sr-only">Search vaults</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 sm:w-56"
          />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 text-neutral-400">No vaults match that search.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((vault) => (
            <li key={vault.slug}>
              <Link
                href={`/vaults/${vault.slug}`}
                onClick={() => track("open_vault", { slug: vault.slug })}
                className="flex h-full flex-col rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{vault.symbol}</h2>
                    <p className="text-sm text-neutral-500">{vault.name}</p>
                  </div>
                  <span className="rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-300">
                    {RISK[vault.risk]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-neutral-400">{vault.summary}</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-brand">{vault.apyText}</p>
                <p className="text-xs text-neutral-500">{vault.apyCaption}</p>
                <p className="mt-3 text-sm text-neutral-300">
                  {formatUsd(vault.tvlUsd)} <span className="text-neutral-500">TVL</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
