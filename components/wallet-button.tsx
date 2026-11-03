"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { formatToken } from "@/lib/token";

export function WalletButton() {
  const { setVisible } = useWalletModal();
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [sol, setSol] = useState<bigint | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const key = publicKey?.toBase58() ?? null;
    if (key && key !== seen.current) {
      track("connect_wallet");
      seen.current = key;
    }
    if (!key) seen.current = null;
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setSol(null);
      return;
    }
    let alive = true;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (alive) setSol(BigInt(lamports));
      })
      .catch(() => {
        if (alive) setSol(null);
      });
    return () => {
      alive = false;
    };
  }, [connection, publicKey]);

  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        className="inline-flex h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-black"
        onClick={() => setVisible(true)}
      >
        Connect wallet
      </button>
    );
  }

  const address = publicKey.toBase58();
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="hidden h-11 items-center rounded-full border border-neutral-800 px-3 text-sm text-neutral-300 sm:inline-flex"
        onClick={() => {
          void navigator.clipboard.writeText(address);
          track("copy_address");
        }}
      >
        {short}
        {sol != null ? <span className="ml-2 text-white">{formatToken(sol, 9, 3)} SOL</span> : null}
      </button>
      <button
        type="button"
        className="inline-flex h-11 items-center rounded-full border border-neutral-700 px-3 text-sm sm:hidden"
        onClick={() => setVisible(true)}
      >
        {short}
      </button>
      <button
        type="button"
        className="inline-flex h-11 items-center rounded-full px-3 text-sm text-neutral-400"
        onClick={() => void disconnect()}
      >
        Disconnect
      </button>
    </div>
  );
}
