"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useNetwork } from "@/components/providers";
import { track } from "@/lib/analytics";
import { compoundedGain } from "@/lib/apy";
import { formatUsd } from "@/lib/format";
import {
  forgetPractice,
  practiceFor,
  practiceMintInstructions,
  rememberPractice,
} from "@/lib/practice";
import {
  decodeVault,
  depositIx,
  initializeVaultIx,
  PROGRAM_ID,
  setPausedIx,
  vaultPda,
  withdrawIx,
  type VaultState,
} from "@/lib/program";
import { errorText, sendInstructions, sendVersioned } from "@/lib/send";
import { assetsForShares, sharesForDeposit } from "@/lib/shares";
import { formatToken, parseAmount } from "@/lib/token";
import type { VaultView } from "@/lib/types";

export function DepositPanel({ vault }: { vault: VaultView }) {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(365);
  const [phase, setPhase] = useState<"form" | "review" | "swap" | "working" | "done">("form");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [programExists, setProgramExists] = useState<boolean | null>(null);
  const [mintExists, setMintExists] = useState(false);
  const [isPractice, setIsPractice] = useState(false);
  const [activeMint, setActiveMint] = useState(vault.mint);
  const [tokenProgram, setTokenProgram] = useState(TOKEN_PROGRAM_ID);
  const [assetBalance, setAssetBalance] = useState(0n);
  const [shareBalance, setShareBalance] = useState(0n);
  const [shareSupply, setShareSupply] = useState(0n);
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [solAmount, setSolAmount] = useState("0.1");
  const [quoteText, setQuoteText] = useState("");
  const [quoteBody, setQuoteBody] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!publicKey || vault.displayOnly) {
        setProgramExists(null);
        return;
      }
      try {
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        if (!alive) return;
        setProgramExists(Boolean(programInfo));
        let mintAddress = vault.mint;
        let practice = false;
        if (network === "devnet") {
          const stored = practiceFor(vault.slug);
          if (stored) {
            const info = await connection.getAccountInfo(new PublicKey(stored.mint));
            if (info) {
              mintAddress = stored.mint;
              practice = true;
            } else forgetPractice(vault.slug);
          }
        }
        if (!alive) return;
        setActiveMint(mintAddress);
        setIsPractice(practice);
        const mintKey = new PublicKey(mintAddress);
        const mintInfo = await connection.getAccountInfo(mintKey);
        if (!alive) return;
        setMintExists(Boolean(mintInfo));
        if (!mintInfo) {
          setAssetBalance(0n);
          setVaultState(null);
          setShareBalance(0n);
          setShareSupply(0n);
          return;
        }
        const program = mintInfo.owner;
        setTokenProgram(program);
        const ata = getAssociatedTokenAddressSync(mintKey, publicKey, false, program);
        try {
          const account = await getAccount(connection, ata, "confirmed", program);
          setAssetBalance(account.amount);
        } catch {
          setAssetBalance(0n);
        }
        const [pda] = vaultPda(mintKey);
        const info = await connection.getAccountInfo(pda);
        const decoded = info ? decodeVault(info.data) : null;
        setVaultState(decoded);
        if (!decoded) {
          setShareBalance(0n);
          setShareSupply(0n);
          return;
        }
        const shareMint = await getMint(connection, decoded.shareMint, "confirmed", program);
        setShareSupply(shareMint.supply);
        const shareAta = getAssociatedTokenAddressSync(decoded.shareMint, publicKey, false, program);
        try {
          const share = await getAccount(connection, shareAta, "confirmed", program);
          setShareBalance(share.amount);
        } catch {
          setShareBalance(0n);
        }
      } catch (err) {
        if (alive) setError(errorText(err));
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [connection, network, publicKey, reloadKey, vault.displayOnly, vault.mint, vault.slug]);

  const parsed = parseAmount(amount, vault.decimals);
  const balance = mode === "deposit" ? assetBalance : shareBalance;
  const quotedShares =
    parsed && parsed > 0n
      ? vaultState
        ? sharesForDeposit(parsed, vaultState.totalAssets, shareSupply)
        : parsed
      : 0n;
  const quotedAssets =
    parsed && vaultState ? assetsForShares(parsed, vaultState.totalAssets, shareSupply) : 0n;
  const tokenUnits = parsed != null ? Number(parsed) / 10 ** vault.decimals : null;
  const usd = tokenUnits != null && vault.priceUsd != null ? tokenUnits * vault.priceUsd : null;
  const gainUsd =
    usd != null && vault.apyNumber != null ? compoundedGain(usd, vault.apyNumber, days) : null;
  const gainTokens =
    tokenUnits != null && vault.apyNumber != null
      ? compoundedGain(tokenUnits, vault.apyNumber, days)
      : null;

  function validate(): string | null {
    if (!publicKey || !signTransaction) return "Connect a wallet to continue.";
    if (parsed == null) return "Enter a valid amount.";
    if (parsed <= 0n) return "Enter an amount greater than zero.";
    if (mode === "deposit" && mintExists && parsed > assetBalance) {
      return "That amount is above your wallet balance.";
    }
    if (mode === "withdraw" && parsed > shareBalance) {
      return "That amount is above your share balance.";
    }
    if (mode === "deposit" && quotedShares <= 0n) return "Amount is too small to mint a share.";
    if (mode === "withdraw" && quotedAssets <= 0n) return "That share amount returns no tokens.";
    if (programExists === false) return "The Doju program is not on this network yet.";
    if (vaultState?.paused && mode === "deposit") return "Deposits are paused.";
    return null;
  }

  async function ensureSol() {
    if (!publicKey) return;
    const sol = await connection.getBalance(publicKey);
    if (sol >= 20_000_000) return;
    if (network !== "devnet") throw new Error("You need SOL for fees.");
    setStatus("Requesting devnet SOL…");
    try {
      const sig = await connection.requestAirdrop(publicKey, 1_000_000_000);
      await connection.confirmTransaction(sig, "confirmed");
    } catch {
      throw new Error("Devnet airdrop failed. Fund this address at faucet.solana.com and retry.");
    }
  }

  async function execute(confirmed: boolean) {
    if (!publicKey || !signTransaction) {
      setVisible(true);
      return;
    }
    const problem = validate();
    if (problem && problem !== "Connect a wallet to continue.") {
      setError(problem);
      return;
    }
    if (network === "mainnet" && !confirmed) {
      setPhase("review");
      setError("");
      return;
    }
    setPhase("working");
    setError("");
    try {
      await ensureSol();
      let mintKey = new PublicKey(activeMint);
      let program = tokenProgram;
      if (!mintExists) {
        if (network !== "devnet") throw new Error("This asset mint is not on mainnet from this RPC.");
        setStatus("Creating a devnet practice token…");
        const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        const minted =
          parsed! > 1_000n * 10n ** BigInt(vault.decimals)
            ? parsed!
            : 1_000n * 10n ** BigInt(vault.decimals);
        const built = practiceMintInstructions({
          payer: publicKey,
          decimals: vault.decimals,
          amount: minted,
          lamports,
        });
        await sendInstructions({
          connection,
          payer: publicKey,
          instructions: built.instructions,
          extraSigners: [built.mint],
          sign: (tx) => signTransaction(tx),
        });
        rememberPractice({
          slug: vault.slug,
          mint: built.mint.publicKey.toBase58(),
          secret: Array.from(built.mint.secretKey),
          decimals: vault.decimals,
        });
        mintKey = built.mint.publicKey;
        program = TOKEN_PROGRAM_ID;
        setIsPractice(true);
        setActiveMint(mintKey.toBase58());
      }

      const [pda] = vaultPda(mintKey);
      let info = await connection.getAccountInfo(pda);
      if (!info) {
        setStatus("Initializing the vault…");
        await sendInstructions({
          connection,
          payer: publicKey,
          instructions: [
            initializeVaultIx({
              authority: publicKey,
              assetMint: mintKey,
              tokenProgram: program,
            }),
          ],
          sign: (tx) => signTransaction(tx),
        });
        info = await connection.getAccountInfo(pda);
      }
      const decoded = info ? decodeVault(info.data) : null;
      if (!decoded) throw new Error("The vault account is missing.");
      const userAsset = getAssociatedTokenAddressSync(mintKey, publicKey, false, program);
      const userShare = getAssociatedTokenAddressSync(decoded.shareMint, publicKey, false, program);
      const supply = (await getMint(connection, decoded.shareMint, "confirmed", program)).supply;

      if (mode === "deposit") {
        const shares = sharesForDeposit(parsed!, decoded.totalAssets, supply);
        setStatus("Depositing…");
        track("deposit_submit", { slug: vault.slug, network });
        const sig = await sendInstructions({
          connection,
          payer: publicKey,
          instructions: [
            createAssociatedTokenAccountIdempotentInstruction(
              publicKey,
              userShare,
              publicKey,
              decoded.shareMint,
              program,
            ),
            depositIx({
              user: publicKey,
              assetMint: mintKey,
              userAsset,
              userShare,
              tokenProgram: program,
              amount: parsed!,
              minShares: shares,
            }),
          ],
          sign: (tx) => signTransaction(tx),
        });
        setSignature(sig);
        track("deposit_success", { slug: vault.slug, network });
      } else {
        const assets = assetsForShares(parsed!, decoded.totalAssets, supply);
        setStatus("Withdrawing…");
        track("withdraw_submit", { slug: vault.slug, network });
        const sig = await sendInstructions({
          connection,
          payer: publicKey,
          instructions: [
            createAssociatedTokenAccountIdempotentInstruction(
              publicKey,
              userAsset,
              publicKey,
              mintKey,
              program,
            ),
            withdrawIx({
              user: publicKey,
              assetMint: mintKey,
              userAsset,
              userShare,
              tokenProgram: program,
              shares: parsed!,
              minAssets: assets,
            }),
          ],
          sign: (tx) => signTransaction(tx),
        });
        setSignature(sig);
        track("withdraw_success", { slug: vault.slug, network });
      }
      setPhase("done");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(errorText(err));
      setPhase("form");
    } finally {
      setStatus("");
    }
  }

  async function reviewSwap() {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (network !== "mainnet") {
      setError("Jupiter swaps are a mainnet action. Switch networks to continue.");
      return;
    }
    const lamports = parseAmount(solAmount, 9);
    if (lamports == null || lamports <= 0n) {
      setError("Enter a SOL amount to swap.");
      return;
    }
    setError("");
    setStatus("Fetching a Jupiter quote…");
    try {
      const response = await fetch(
        `/api/jupiter/quote?outputMint=${vault.mint}&amount=${lamports.toString()}`,
      );
      const body = (await response.json()) as { outAmount?: string; error?: string };
      if (!response.ok || !body.outAmount) {
        throw new Error(body.error || "Jupiter quote failed.");
      }
      setQuoteBody(body);
      setQuoteText(formatToken(BigInt(body.outAmount), vault.decimals));
      setPhase("swap");
      track("jupiter_quote", { slug: vault.slug });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setStatus("");
    }
  }

  async function sendSwap() {
    if (!publicKey || !signTransaction || !quoteBody) return;
    setPhase("working");
    setError("");
    try {
      setStatus("Building the Jupiter swap…");
      const response = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteResponse: quoteBody, userPublicKey: publicKey.toBase58() }),
      });
      const body = (await response.json()) as { swapTransaction?: string; error?: string };
      if (!response.ok || !body.swapTransaction) {
        throw new Error(body.error || "Jupiter could not build the swap.");
      }
      const tx = VersionedTransaction.deserialize(Buffer.from(body.swapTransaction, "base64"));
      track("jupiter_swap", { slug: vault.slug });
      const sig = await sendVersioned({
        connection,
        tx,
        sign: (versioned) => signTransaction(versioned),
      });
      setSignature(sig);
      setPhase("done");
    } catch (err) {
      setError(errorText(err));
      setPhase("form");
    } finally {
      setStatus("");
    }
  }

  async function togglePause() {
    if (!publicKey || !signTransaction || !vaultState) return;
    if (network === "mainnet") {
      const ok = window.confirm("This sends a mainnet transaction to pause or resume deposits.");
      if (!ok) return;
    }
    setPhase("working");
    try {
      const sig = await sendInstructions({
        connection,
        payer: publicKey,
        instructions: [
          setPausedIx({
            authority: publicKey,
            assetMint: new PublicKey(activeMint),
            paused: !vaultState.paused,
          }),
        ],
        sign: (tx) => signTransaction(tx),
      });
      setSignature(sig);
      setPhase("done");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(errorText(err));
      setPhase("form");
    }
  }

  const explorer =
    network === "devnet"
      ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      : `https://explorer.solana.com/tx/${signature}`;

  if (vault.displayOnly) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <h2 className="text-lg font-semibold">Whitelist only</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Doju does not take deposits for this asset. Access is handled by the issuer.
        </p>
        {vault.sourceUrl ? (
          <a className="mt-4 inline-flex h-11 items-center text-sm text-brand" href={vault.sourceUrl}>
            Issuer page
          </a>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-black p-1" role="tablist">
        {(["deposit", "withdraw"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            className={`h-11 rounded-full text-sm font-semibold capitalize ${
              mode === item ? "bg-brand text-black" : "text-neutral-400"
            }`}
            onClick={() => {
              setMode(item);
              setPhase("form");
              setError("");
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {network === "devnet" ? (
        <p className="mt-4 text-sm text-neutral-400">
          {isPractice
            ? "This position uses a practice token stored in this browser. It is not the mainnet asset."
            : "On devnet, the first deposit creates a practice token and a Doju share vault for it."}
        </p>
      ) : null}

      {publicKey ? (
        <p className="mt-3 text-sm text-neutral-300">
          Balance{" "}
          <span className="text-white">
            {formatToken(balance, vault.decimals)} {mode === "deposit" ? vault.symbol : "shares"}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">Connect a wallet to see balances.</p>
      )}

      <label className="mt-4 block text-sm" htmlFor="amount">
        Amount
        <input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-neutral-800 bg-black px-3 text-base"
          placeholder="0.0"
        />
      </label>
      {publicKey && mintExists ? (
        <button
          type="button"
          className="mt-2 text-sm text-brand"
          onClick={() => setAmount(formatToken(balance, vault.decimals, vault.decimals))}
        >
          Use max
        </button>
      ) : null}

      <div className="mt-4">
        <p className="text-sm text-neutral-400">Projected earnings</p>
        <div className="mt-2 flex gap-2">
          {[30, 90, 365].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={days === option}
              className={`h-10 rounded-full px-3 text-sm ${
                days === option ? "bg-brand text-black" : "border border-neutral-800"
              }`}
              onClick={() => setDays(option)}
            >
              {option}d
            </button>
          ))}
        </div>
        {vault.apyNumber == null ? (
          <p className="mt-2 text-sm text-neutral-500">No published rate, so earnings are not projected.</p>
        ) : (
          <p className="mt-2 text-sm">
            {gainUsd != null ? formatUsd(gainUsd) : gainTokens != null ? `${gainTokens.toFixed(4)} ${vault.symbol}` : "—"}
            <span className="block text-neutral-500">
              {vault.apySource === "estimate"
                ? "From an estimated rate, if it stayed flat."
                : vault.apySource === "snapshot"
                  ? "From the snapshot rate, if it stayed flat."
                  : "From the reference APY, if it stayed flat. Not a guarantee."}
            </span>
          </p>
        )}
      </div>

      {mode === "deposit" && parsed && parsed > 0n ? (
        <p className="mt-3 text-sm text-neutral-400">
          About {formatToken(quotedShares, vault.decimals)} shares
          {vaultState ? "" : ", 1:1 on the first deposit"}.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-neutral-400" aria-live="polite">
        {status}
      </p>

      {phase === "review" || phase === "swap" ? (
        <div className="mt-4 rounded-xl border border-brand p-4">
          <h3 className="font-semibold">Confirm mainnet</h3>
          <p className="mt-2 text-sm text-neutral-300">
            {phase === "swap"
              ? `Swap ${solAmount} SOL for about ${quoteText} ${vault.symbol} on Jupiter. This spends real SOL. Holding the LST is the staking position. It does not deposit into the Doju vault.`
              : `${mode === "deposit" ? "Deposit" : "Withdraw"} ${amount || "0"} ${
                  mode === "deposit" ? vault.symbol : "shares"
                } on mainnet.`}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="h-11 rounded-full px-4 text-sm" onClick={() => setPhase("form")}>
              Back
            </button>
            <button
              type="button"
              className="h-11 rounded-full bg-brand px-4 text-sm font-semibold text-black"
              onClick={() => void (phase === "swap" ? sendSwap() : execute(true))}
            >
              Send mainnet transaction
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 h-12 w-full rounded-full bg-brand text-sm font-semibold text-black disabled:opacity-50"
          disabled={phase === "working"}
          onClick={() => void (publicKey ? execute(false) : setVisible(true))}
        >
          {phase === "working"
            ? "Working…"
            : !publicKey
              ? "Connect wallet"
              : network === "mainnet"
                ? `Review ${mode} on mainnet`
                : `${mode === "deposit" ? "Deposit" : "Withdraw"} on devnet`}
        </button>
      )}

      {phase === "done" && signature ? (
        <a className="mt-3 block text-sm text-brand" href={explorer}>
          View transaction
        </a>
      ) : null}

      {vaultState && publicKey && vaultState.authority.equals(publicKey) ? (
        <button type="button" className="mt-3 text-sm text-neutral-400" onClick={() => void togglePause()}>
          {vaultState.paused ? "Resume deposits" : "Pause deposits"}
        </button>
      ) : null}

      {programExists === false ? (
        <p className="mt-3 text-sm text-neutral-500">
          Program {PROGRAM_ID.toBase58().slice(0, 4)}… is not deployed here. Devnet deploy steps are in the README.
        </p>
      ) : null}

      {vault.jupiterFromSol ? (
        <div className="mt-6 border-t border-neutral-800 pt-4">
          <h3 className="text-sm font-semibold">Swap SOL on Jupiter</h3>
          <p className="mt-1 text-sm text-neutral-400">
            Mainnet only. You receive {vault.symbol}. That token is the staking position.
          </p>
          <label className="mt-3 block text-sm" htmlFor="sol-amount">
            SOL amount
            <input
              id="sol-amount"
              inputMode="decimal"
              value={solAmount}
              onChange={(event) => setSolAmount(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-neutral-800 bg-black px-3 text-base"
            />
          </label>
          <button
            type="button"
            className="mt-3 h-11 rounded-full border border-brand px-4 text-sm font-semibold text-brand disabled:opacity-40"
            disabled={network !== "mainnet" || phase === "working"}
            onClick={() => void reviewSwap()}
          >
            {network === "mainnet" ? "Review Jupiter swap" : "Available on mainnet"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
