"use client";

import { useEffect, useState } from "react";
import { useNetwork } from "@/components/providers";
import { track } from "@/lib/analytics";

export function NetworkBanner() {
  const { network, setNetwork } = useNetwork();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!ask) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAsk(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask]);

  const mainnet = network === "mainnet";

  return (
    <>
      <div
        className={
          mainnet
            ? "bg-brand text-black"
            : "border-b border-brand/40 bg-black text-brand"
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm font-medium leading-snug">
            {mainnet
              ? "Mainnet · real funds. Every transaction asks you to confirm before it is sent."
              : "Devnet · practice only. Yield figures are mainnet market data. Deposits here use test tokens."}
          </p>
          <div className="flex shrink-0 rounded-full border border-black/20 bg-black/30 p-1" role="group" aria-label="Network">
            {(["devnet", "mainnet"] as const).map((option) => {
              const active = network === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  className={`h-10 rounded-full px-4 text-sm font-semibold capitalize ${
                    active ? "bg-brand text-black" : mainnet ? "text-white" : "text-neutral-300"
                  }`}
                  onClick={() => {
                    if (option === network) return;
                    if (option === "mainnet") setAsk(true);
                    else {
                      setNetwork("devnet");
                      track("switch_network", { network: "devnet" });
                    }
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {ask ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 sm:place-items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mainnet-title"
            className="w-full max-w-md border border-brand bg-black p-5"
          >
            <h2 id="mainnet-title" className="text-xl font-semibold">
              Switch to mainnet?
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              Your wallet will use mainnet. Tokens and fees are real. Each send still needs its own confirmation.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="h-11 rounded-full px-4 text-sm"
                autoFocus
                onClick={() => setAsk(false)}
              >
                Stay on devnet
              </button>
              <button
                type="button"
                className="h-11 rounded-full bg-brand px-4 text-sm font-semibold text-black"
                onClick={() => {
                  setNetwork("mainnet");
                  track("switch_network", { network: "mainnet" });
                  setAsk(false);
                }}
              >
                Use mainnet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
