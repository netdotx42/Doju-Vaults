import assert from "node:assert/strict";
import test from "node:test";
import { assetsForShares, sharesForDeposit } from "./shares";

test("first deposit is one for one", () => {
  assert.equal(sharesForDeposit(1_000n, 0n, 0n), 1_000n);
});

test("later deposits round down", () => {
  assert.equal(sharesForDeposit(2n, 4n, 3n), 1n);
  assert.equal(assetsForShares(1n, 4n, 3n), 1n);
});

test("dust withdrawals are zero", () => {
  assert.equal(assetsForShares(1n, 1n, 100n), 0n);
});
