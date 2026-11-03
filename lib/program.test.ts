import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { DISC } from "./program";

function sighash(name: string): string {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8).toString("hex");
}

test("instruction discriminators match Anchor sighashes", () => {
  assert.equal(DISC.initialize.toString("hex"), sighash("initialize_vault"));
  assert.equal(DISC.deposit.toString("hex"), sighash("deposit"));
  assert.equal(DISC.withdraw.toString("hex"), sighash("withdraw"));
  assert.equal(DISC.setPaused.toString("hex"), sighash("set_paused"));
  const account = createHash("sha256").update("account:Vault").digest().subarray(0, 8);
  assert.equal(DISC.vault.toString("hex"), account.toString("hex"));
});
