import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { DOJU_PROGRAM_ID } from "@/config/solana";

export const PROGRAM_ID = new PublicKey(DOJU_PROGRAM_ID);

const IX_INIT = Buffer.from("30bfa32c47813fa4", "hex");
const IX_DEPOSIT = Buffer.from("f223c68952e1f2b6", "hex");
const IX_WITHDRAW = Buffer.from("b712469c946da122", "hex");
const IX_PAUSE = Buffer.from("5b3c7dc0b0e1a6da", "hex");
export const VAULT_DISCRIMINATOR = Buffer.from("d308e82b02987577", "hex");

export const DISC = {
  initialize: IX_INIT,
  deposit: IX_DEPOSIT,
  withdraw: IX_WITHDRAW,
  setPaused: IX_PAUSE,
  vault: VAULT_DISCRIMINATOR,
};

function u64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

export function vaultPda(mint: PublicKey, programId = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], programId);
}

export function shareMintPda(mint: PublicKey, programId = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("share"), mint.toBuffer()], programId);
}

export type VaultState = {
  authority: PublicKey;
  assetMint: PublicKey;
  shareMint: PublicKey;
  vaultToken: PublicKey;
  bump: number;
  shareBump: number;
  paused: boolean;
  totalAssets: bigint;
  assetDecimals: number;
};

export function decodeVault(data: Uint8Array): VaultState | null {
  const buf = Buffer.from(data);
  if (buf.length < 8 + 32 * 4 + 3 + 8 + 1) return null;
  if (!buf.subarray(0, 8).equals(VAULT_DISCRIMINATOR)) return null;
  let offset = 8;
  const readPk = () => {
    const key = new PublicKey(buf.subarray(offset, offset + 32));
    offset += 32;
    return key;
  };
  const authority = readPk();
  const assetMint = readPk();
  const shareMint = readPk();
  const vaultToken = readPk();
  const bump = buf[offset++] ?? 0;
  const shareBump = buf[offset++] ?? 0;
  const paused = buf[offset++] === 1;
  const totalAssets = buf.readBigUInt64LE(offset);
  offset += 8;
  const assetDecimals = buf[offset] ?? 0;
  return {
    authority,
    assetMint,
    shareMint,
    vaultToken,
    bump,
    shareBump,
    paused,
    totalAssets,
    assetDecimals,
  };
}

export function initializeVaultIx(args: {
  authority: PublicKey;
  assetMint: PublicKey;
  tokenProgram: PublicKey;
}): TransactionInstruction {
  const [vault] = vaultPda(args.assetMint);
  const [shareMint] = shareMintPda(args.assetMint);
  const vaultToken = getAssociatedTokenAddressSync(
    args.assetMint,
    vault,
    true,
    args.tokenProgram,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: args.assetMint, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: shareMint, isSigner: false, isWritable: true },
      { pubkey: vaultToken, isSigner: false, isWritable: true },
      { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: IX_INIT,
  });
}

export function depositIx(args: {
  user: PublicKey;
  assetMint: PublicKey;
  userAsset: PublicKey;
  userShare: PublicKey;
  tokenProgram: PublicKey;
  amount: bigint;
  minShares: bigint;
}): TransactionInstruction {
  const [vault] = vaultPda(args.assetMint);
  const [shareMint] = shareMintPda(args.assetMint);
  const vaultToken = getAssociatedTokenAddressSync(
    args.assetMint,
    vault,
    true,
    args.tokenProgram,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: args.user, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: args.assetMint, isSigner: false, isWritable: false },
      { pubkey: shareMint, isSigner: false, isWritable: true },
      { pubkey: vaultToken, isSigner: false, isWritable: true },
      { pubkey: args.userAsset, isSigner: false, isWritable: true },
      { pubkey: args.userShare, isSigner: false, isWritable: true },
      { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([IX_DEPOSIT, u64(args.amount), u64(args.minShares)]),
  });
}

export function withdrawIx(args: {
  user: PublicKey;
  assetMint: PublicKey;
  userAsset: PublicKey;
  userShare: PublicKey;
  tokenProgram: PublicKey;
  shares: bigint;
  minAssets: bigint;
}): TransactionInstruction {
  const [vault] = vaultPda(args.assetMint);
  const [shareMint] = shareMintPda(args.assetMint);
  const vaultToken = getAssociatedTokenAddressSync(
    args.assetMint,
    vault,
    true,
    args.tokenProgram,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: args.user, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: args.assetMint, isSigner: false, isWritable: false },
      { pubkey: shareMint, isSigner: false, isWritable: true },
      { pubkey: vaultToken, isSigner: false, isWritable: true },
      { pubkey: args.userAsset, isSigner: false, isWritable: true },
      { pubkey: args.userShare, isSigner: false, isWritable: true },
      { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([IX_WITHDRAW, u64(args.shares), u64(args.minAssets)]),
  });
}

export function setPausedIx(args: {
  authority: PublicKey;
  assetMint: PublicKey;
  paused: boolean;
}): TransactionInstruction {
  const [vault] = vaultPda(args.assetMint);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([IX_PAUSE, Buffer.from([args.paused ? 1 : 0])]),
  });
}
