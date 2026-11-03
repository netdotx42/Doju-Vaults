import assert from "node:assert/strict";
import test from "node:test";
import { formatToken, parseAmount } from "./token";

test("parses token amounts and rejects extra precision", () => {
  assert.equal(parseAmount("1.5", 6), 1_500_000n);
  assert.equal(parseAmount("0", 6), 0n);
  assert.equal(parseAmount("1.5000001", 6), null);
  assert.equal(parseAmount("abc", 6), null);
});

test("formats token amounts without trailing zeros", () => {
  assert.equal(formatToken(1_500_000n, 6), "1.5");
  assert.equal(formatToken(1_000_000n, 6), "1");
  assert.equal(formatToken(1n, 6), "0.000001");
});
