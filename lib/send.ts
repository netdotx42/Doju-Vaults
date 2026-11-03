import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import type { Keypair } from "@solana/web3.js";

export async function sendInstructions(args: {
  connection: Connection;
  payer: PublicKey;
  instructions: TransactionInstruction[];
  sign: (tx: Transaction) => Promise<Transaction>;
  extraSigners?: Keypair[];
}): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await args.connection.getLatestBlockhash(
    "confirmed",
  );
  const tx = new Transaction({
    feePayer: args.payer,
    blockhash,
    lastValidBlockHeight,
  }).add(...args.instructions);
  if (args.extraSigners?.length) tx.partialSign(...args.extraSigners);
  const signed = await args.sign(tx);
  const signature = await args.connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  await args.connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return signature;
}

export async function sendVersioned(args: {
  connection: Connection;
  tx: VersionedTransaction;
  sign: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}): Promise<string> {
  const signed = await args.sign(args.tx);
  const signature = await args.connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  const latest = await args.connection.getLatestBlockhash("confirmed");
  await args.connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
  return signature;
}

export function errorText(err: unknown): string {
  const message = err instanceof Error ? err.message : "Something went wrong.";
  if (/user rejected|rejected the request|denied/i.test(message)) {
    return "The wallet cancelled the request.";
  }
  return message.length > 320 ? `${message.slice(0, 320)}…` : message;
}
