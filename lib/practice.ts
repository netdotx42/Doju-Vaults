import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";

const KEY = "doju.practice.v1";

export type PracticeMint = {
  slug: string;
  mint: string;
  secret: number[];
  decimals: number;
};

export function loadPractice(): PracticeMint[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as PracticeMint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function practiceFor(slug: string): PracticeMint | null {
  return loadPractice().find((item) => item.slug === slug) ?? null;
}

export function rememberPractice(entry: PracticeMint): void {
  const next = loadPractice().filter((item) => item.slug !== entry.slug);
  next.push(entry);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function forgetPractice(slug: string): void {
  const next = loadPractice().filter((item) => item.slug !== slug);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function practiceMintInstructions(args: {
  payer: PublicKey;
  decimals: number;
  amount: bigint;
  lamports: number;
}): { mint: Keypair; instructions: TransactionInstruction[] } {
  const mint = Keypair.generate();
  const ata = getAssociatedTokenAddressSync(mint.publicKey, args.payer, false, TOKEN_PROGRAM_ID);
  const instructions: TransactionInstruction[] = [
    SystemProgram.createAccount({
      fromPubkey: args.payer,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: args.lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      args.decimals,
      args.payer,
      null,
      TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountInstruction(
      args.payer,
      ata,
      args.payer,
      mint.publicKey,
      TOKEN_PROGRAM_ID,
    ),
    createMintToInstruction(
      mint.publicKey,
      ata,
      args.payer,
      args.amount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  ];
  return { mint, instructions };
}

export async function rentForMint(getRent: (space: number) => Promise<number>): Promise<number> {
  return getRent(MINT_SIZE);
}
