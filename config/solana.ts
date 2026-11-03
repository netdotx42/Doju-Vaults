export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const DOJU_PROGRAM_ID =
  process.env.NEXT_PUBLIC_DOJU_VAULT_PROGRAM_ID ||
  "H1QaDVDzpWcCdHvpGyb7CND7s3NqdP3zVn6ETeAm2yuF";

export const RPC = {
  devnet:
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || "https://api.devnet.solana.com",
  mainnet:
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
    "https://api.mainnet-beta.solana.com",
} as const;

export type NetworkName = "devnet" | "mainnet";

export const DEFAULT_NETWORK: NetworkName =
  process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "mainnet" : "devnet";
