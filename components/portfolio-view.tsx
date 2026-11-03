"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useNetwork } from "@/components/providers";
import { formatToken } from "@/lib/token";
import { formatUsd } from "@/lib/format";
import { loadPractice } from "@/lib/practice";
import { decodeVault, vaultPda } from "@/lib/program";
import { assetsForShares } from "@/lib/shares";
import type { VaultView } from "@/lib/types";

type Position = {
  slug: string;
  symbol: string;
  assets: bigint;
  shares: bigint;
  decimals: number;
  practice: boolean;
};

type Balance = { symbol: string; amount: bigint; decimals: number; usd: number | null };

export function PortfolioView({ vaults }: { vaults: VaultView[] }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const [positions, setPositions] = useState<Position[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [sol, setSol] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!publicKey) {
        setPositions([]);
        setBalances([]);
        setSol(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!alive) return;
        setSol(BigInt(lamports));
        const tokenPrograms = [
          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
        ];
        const accounts = (
          await Promise.all(
            tokenPrograms.map((programId) =>
              connection.getParsedTokenAccountsByOwner(publicKey, { programId }).catch(() => ({ value: [] })),
            ),
          )
        ).flatMap((result) => result.value);
        const byMint = new Map<string, { amount: bigint; decimals: number }>();
        for (const account of accounts) {
          const parsed = account.account.data.parsed as {
            info: { mint: string; tokenAmount: { amount: string; decimals: number } };
          };
          const info = parsed.info;
          const prev = byMint.get(info.mint);
          const amount = BigInt(info.tokenAmount.amount);
          byMint.set(info.mint, {
            amount: (prev?.amount ?? 0n) + amount,
            decimals: info.tokenAmount.decimals,
          });
        }
        const rows: Balance[] = [];
        for (const vault of vaults) {
          const held = byMint.get(vault.mint);
          if (!held || held.amount === 0n) continue;
          rows.push({
            symbol: vault.symbol,
            amount: held.amount,
            decimals: held.decimals,
            usd: vault.priceUsd != null ? (Number(held.amount) / 10 ** held.decimals) * vault.priceUsd : null,
          });
        }
        if (!alive) return;
        setBalances(rows);

        const targets = [
          ...vaults.filter((vault) => !vault.displayOnly).map((vault) => ({
            slug: vault.slug,
            symbol: vault.symbol,
            mint: vault.mint,
            decimals: vault.decimals,
            practice: false,
          })),
        ];
        if (network === "devnet") {
          for (const practice of loadPractice()) {
            const match = vaults.find((vault) => vault.slug === practice.slug);
            targets.push({
              slug: practice.slug,
              symbol: match?.symbol ?? "Practice",
              mint: practice.mint,
              decimals: practice.decimals,
              practice: true,
            });
          }
        }
        const pdas = targets.map((target) => vaultPda(new PublicKey(target.mint))[0]);
        const infos = await connection.getMultipleAccountsInfo(pdas);
        const found: Position[] = [];
        const shareAtas: PublicKey[] = [];
        const shareMeta: { index: number; supply: bigint; total: bigint }[] = [];
        infos.forEach((info, index) => {
          if (!info) return;
          const decoded = decodeVault(info.data);
          if (!decoded) return;
          const target = targets[index];
          shareAtas.push(
            getAssociatedTokenAddressSync(decoded.shareMint, publicKey, false, tokenPrograms[0]),
          );
          shareMeta.push({ index, supply: 0n, total: decoded.totalAssets });
          found.push({
            slug: target.slug,
            symbol: target.symbol,
            assets: 0n,
            shares: 0n,
            decimals: target.decimals,
            practice: target.practice,
          });
        });
        if (shareAtas.length) {
          const atas = await connection.getMultipleAccountsInfo(shareAtas);
          const mints = infos
            .map((info) => (info ? decodeVault(info.data) : null))
            .filter((item): item is NonNullable<typeof item> => item != null);
          const mintInfos = await connection.getMultipleAccountsInfo(mints.map((item) => item.shareMint));
          atas.forEach((ata, index) => {
            const shares = ata && ata.data.length >= 72 ? Buffer.from(ata.data).readBigUInt64LE(64) : 0n;
            const mintInfo = mintInfos[index];
            const supply =
              mintInfo && mintInfo.data.length >= 44 ? Buffer.from(mintInfo.data).readBigUInt64LE(36) : 0n;
            const total = shareMeta[index]?.total ?? 0n;
            found[index] = {
              ...found[index],
              shares,
              assets: assetsForShares(shares, total, supply),
            };
          });
        }
        if (!alive) return;
        setPositions(found.filter((position) => position.shares > 0n));
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not load the portfolio.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [connection, network, publicKey, vaults]);

  if (!publicKey) {
    return <p className="text-neutral-400">Connect a wallet to see balances and Doju positions.</p>;
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <section>
        <h2 className="text-lg font-semibold">Wallet</h2>
        <p className="mt-2 text-sm text-neutral-300">
          {sol == null ? "SOL balance loading" : `${formatToken(sol, 9, 4)} SOL`}
          {loading ? " · refreshing" : ""}
        </p>
        {balances.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No vault-asset balances in this wallet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-900 rounded-2xl border border-neutral-800">
            {balances.map((row) => (
              <li key={row.symbol} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{row.symbol}</span>
                <span>
                  {formatToken(row.amount, row.decimals)}{" "}
                  <span className="text-neutral-500">{formatUsd(row.usd)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-lg font-semibold">Doju positions</h2>
        {positions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            No share tokens yet. Open a vault to deposit.
            {network === "devnet" ? " Devnet deposits use a practice token." : ""}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {positions.map((position) => (
              <li key={`${position.slug}-${position.practice}`}>
                <Link
                  href={`/vaults/${position.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-neutral-800 px-4 py-3"
                >
                  <span>
                    {position.symbol}
                    {position.practice ? <span className="ml-2 text-xs text-brand">Practice</span> : null}
                  </span>
                  <span className="text-sm text-neutral-300">
                    {formatToken(position.assets, position.decimals)} underlying
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
