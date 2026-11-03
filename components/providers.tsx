"use client";

import { Buffer } from "buffer";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-unsafe-burner";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import type { Adapter } from "@solana/wallet-adapter-base";
import "@solana/wallet-adapter-react-ui/styles.css";
import { DEFAULT_NETWORK, RPC, type NetworkName } from "@/config/solana";

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

type NetworkContextValue = {
  network: NetworkName;
  setNetwork: (network: NetworkName) => void;
  endpoint: string;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) throw new Error("useNetwork must be used inside Providers");
  return value;
}

export function Providers({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkName>(DEFAULT_NETWORK);

  useEffect(() => {
    const saved = window.localStorage.getItem("doju.network");
    if (saved === "mainnet" || saved === "devnet") setNetworkState(saved);
  }, []);

  const setNetwork = (next: NetworkName) => {
    setNetworkState(next);
    window.localStorage.setItem("doju.network", next);
  };

  const endpoint = network === "mainnet" ? RPC.mainnet : RPC.devnet;

  return (
    <NetworkContext.Provider value={{ network, setNetwork, endpoint }}>
      <WalletStack endpoint={endpoint} network={network}>
        {children}
      </WalletStack>
    </NetworkContext.Provider>
  );
}

function WalletStack({
  children,
  endpoint,
  network,
}: {
  children: ReactNode;
  endpoint: string;
  network: NetworkName;
}) {
  const [wallets, setWallets] = useState<Adapter[]>([]);

  useEffect(() => {
    const list: Adapter[] = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ];
    if (process.env.NEXT_PUBLIC_ENABLE_BURNER === "true") {
      list.push(new UnsafeBurnerWalletAdapter());
    }
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) {
      list.push(
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: { name: "Doju Vaults", uri: "https://doju.vaults" },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          chain: network === "mainnet" ? "solana:mainnet" : "solana:devnet",
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
      );
    }
    setWallets(list);
  }, [network]);

  const endpointMemo = useMemo(() => endpoint, [endpoint]);

  return (
    <ConnectionProvider endpoint={endpointMemo} key={endpointMemo}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
