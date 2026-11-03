# Doju Vaults

Solana yield vaults for liquid staking, stablecoins, real-world assets, and DePIN. Black UI, orange highlights, wallet connect, and a share-token program you can deploy to devnet.

This is unaudited software. It is not financial advice. Rates can be wrong, stale, estimated, or unpublished. Do not deposit money you cannot lose.

## What you get

- A catalog of vaults chosen from DefiLlama and protocol pages on 3 Nov 2026. Pool IDs are hardcoded. PYTH, BONK, and MOBILE are left out on purpose.
- Live APY and TVL from `https://yields.llama.fi/pools`. The file is about 14MB, above Next’s 2MB fetch cache, so the server keeps it in memory for five minutes and the small JSON routes send `Cache-Control`. If the feed fails, the UI says **Snapshot · 3 Nov 2026** and uses `data/yield-research.json`.
- Prices from Jupiter (`lite-api.jup.ag/price/v3`), then DefiLlama, then that same snapshot.
- Estimated rates (JUP DAO, GRASS, CETES, USTRY, OUSG) stay labeled **Estimated**. Null APYs show **Variable / Not published**. Volatile pools (Galaxy USDT, Steakhouse USDC, RENDER–SOL, ACRED) show the **30-day average**.
- KYC / whitelist assets (OUSG, BUIDL, ACRED, VBILL, USCC) are display-only.
- Phantom, Solflare, and Backpack, plus the Solana mobile wallet adapter on phones.
- Devnet by default. The banner is always visible. Mainnet sends require an on-screen confirmation.
- An Anchor program, `programs/doju_vault`, with per-mint share accounting, deposit, withdraw, and pause.

The reference APY is the underlying protocol’s. The Doju program only custodies the token and mints shares. It does not allocate into Kamino or Jupiter Lend. On mainnet, LST vaults can optionally swap SOL into the LST on Jupiter. Holding that LST is the staking position.

## Setup

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open http://localhost:3000. No env vars are required to build or run.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DOJU_VAULT_PROGRAM_ID` | Override the program id after you deploy. Default is the committed devnet id. |
| `NEXT_PUBLIC_SOLANA_RPC_DEVNET` | Devnet RPC. Default `https://api.devnet.solana.com`. |
| `NEXT_PUBLIC_SOLANA_RPC_MAINNET` | Mainnet RPC. Default `https://api.mainnet-beta.solana.com`. |
| `NEXT_PUBLIC_DEFAULT_NETWORK` | `devnet` (default) or `mainnet`. The in-app switch still works. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO. On Vercel, `VERCEL_URL` is used if this is empty. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional Plausible domain. Unset means no analytics script. `lib/analytics.ts` is the event hook. |
| `NEXT_PUBLIC_ENABLE_BURNER` | `true` adds an in-memory devnet wallet. Do not enable this on a mainnet deploy. |

`NEXT_PUBLIC_*` values are inlined at build time.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:unit      # APY labels, share math, discriminators
npm run test:program   # Anchor program tests via cargo
npm run keys:sync      # copy keys/doju_vault-devnet.json into target/deploy
```

## Devnet program

The program id is `H1QaDVDzpWcCdHvpGyb7CND7s3NqdP3zVn6ETeAm2yuF`.

The matching keypair is `keys/doju_vault-devnet.json`. It is a demo key. Anyone with the repo can upgrade a program deployed with it. Generate a new key before mainnet, put the pubkey in `declare_id!`, and set `ENFORCE_ADMIN` in `programs/doju_vault/src/lib.rs`.

You need Solana CLI 1.18.x and Anchor CLI 0.30.1 (the crate version). A funded deployer wallet is separate from the program keypair.

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked
solana config set --url devnet
solana-keygen new -o ~/.config/solana/id.json
solana airdrop 2
npm run keys:sync
anchor build
anchor deploy --provider.cluster devnet
```

Public devnet RPC is rate-limited. Set `NEXT_PUBLIC_SOLANA_RPC_DEVNET` if airdrops or deploys fail.

On devnet, mainnet mints usually do not exist. The deposit button creates a practice SPL token, initializes a vault for it, and deposits. The mint secret stays in `localStorage`. It cannot move mainnet funds.

## Mainnet

Switching to mainnet asks first. Each deposit, withdraw, pause, and Jupiter swap then shows a confirmation that says mainnet before anything is signed. Jupiter routing is only offered on LST vaults (JitoSOL, mSOL, JupSOL, INF, dSOL) and only swaps SOL into that token.

Do not point mainnet at the demo program id.

## Architecture

```
app/                Next.js App Router pages and route handlers
components/         Header, wallet, vault list, deposit panel
config/vaults.ts    Typed vault list (the only catalog)
config/solana.ts    Program id and RPC defaults
lib/live.ts         DefiLlama + Jupiter fetches, 5 min / 1 min cache
lib/catalog.ts      Joins the catalog with live or snapshot numbers
data/yield-research.json
programs/doju_vault Rust share vault
```

Share math: the first deposit mints 1 share per raw token unit. Later deposits and withdrawals round down. `total_assets` is updated only by deposit and withdraw, so donating tokens to the vault account does not change the price. Withdrawals stay open when deposits are paused. The initializer is the pause authority until you turn on `ENFORCE_ADMIN`.

Vercel: the Next.js app is the repo root. `next build` does not need secrets. Rust is not part of the Vercel build.

## Data

Research notes live in `data/yield-research.json` (pulled 3 Nov 2026). The UI does not invent a live number. Hero TVL is the sum of listed markets that are marked safe to add. Maple syrupUSDC TVL is the Ethereum pool and is excluded from the hero. Whitelist funds are excluded too.

## Tests

`npm run test:unit` checks labels and share math.

`npm run test:program` needs Rust 1.85 or newer (`rustup update stable`). It runs the Anchor flow in `solana-program-test`: init, two depositors, rounding, slippage, pause, withdraw-while-paused, and a rejected pause from a non-authority.

`anchor test` is wired to that same cargo test. Anchor CLI 0.30.1 does not publish a Linux binary; install it with the cargo command above if you want `anchor build` / `anchor deploy`.
