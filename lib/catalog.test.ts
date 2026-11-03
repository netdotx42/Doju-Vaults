import assert from "node:assert/strict";
import test from "node:test";
import { VAULTS } from "../config/vaults";
import { buildViews } from "./catalog";
import { venueFor } from "./research";

const data = buildViews(null, {}, false);

test("catalog matches the 3 Nov 2026 research set", () => {
  const core = VAULTS.filter((vault) => vault.category === "core").map((vault) => vault.asset);
  assert.deepEqual(core, ["SOL", "JitoSOL", "mSOL", "JupSOL", "INF", "dSOL", "JUP", "JTO"]);
  const symbols = new Set(VAULTS.map((vault) => vault.asset));
  for (const dropped of ["PYTH", "BONK", "MOBILE"]) {
    assert.equal(symbols.has(dropped), false);
  }
  assert.ok(VAULTS.some((vault) => vault.asset === "USDC" && vault.venueIndex === 0));
  assert.ok(VAULTS.filter((vault) => vault.asset === "USDC").length >= 5);
  assert.deepEqual(
    VAULTS.filter((vault) => vault.asset === "USDT").map((vault) => vault.slug),
    ["usdt-jupiter", "usdt-galaxy", "usdt-save"],
  );
});

test("labels estimates, unpublished rates, volatile pools, and whitelist assets", () => {
  const bySlug = Object.fromEntries(data.vaults.map((vault) => [vault.slug, vault]));
  assert.equal(bySlug["jup-dao"].apySource, "estimate");
  assert.match(bySlug["jup-dao"].apyText, /^Est\./);
  assert.equal(bySlug.hnt.apyText, "Variable");
  assert.equal(bySlug.io.apySource, "unpublished");
  assert.equal(bySlug.honey.apySource, "unpublished");
  assert.equal(bySlug.nos.apySource, "unpublished");
  assert.match(bySlug.nos.summary, /28 Nov 2026/);
  assert.equal(bySlug.render.prefer30d, true);
  assert.equal(bySlug.render.ilRisk, true);
  assert.equal(bySlug["usdt-galaxy"].prefer30d, true);
  assert.match(bySlug["usdt-galaxy"].apyCaption, /30-day/);
  for (const slug of ["ousg", "buidl", "acred", "vbill", "uscc"]) {
    assert.equal(bySlug[slug].displayOnly, true, slug);
  }
  assert.equal(bySlug.usdy.displayOnly, false);
  assert.equal(venueFor(VAULTS.find((vault) => vault.slug === "jitosol")!).defillamaPoolId,
    "0e7d0722-9054-4907-8593-567b353c0900");
  assert.equal(bySlug["sol-gauntlet"].poolId, "9a9cfa6c-8ec9-5d09-857e-aa596901f3ee");
});

test("hero totals skip ethereum-sized syrup TVL and whitelist funds", () => {
  assert.ok((data.aggregate.tvlUsd ?? 0) < 5_000_000_000);
  assert.equal(data.vaults.find((vault) => vault.slug === "syrup-usdc")?.aggregate, "none");
  assert.equal(data.vaults.find((vault) => vault.slug === "buidl")?.aggregate, "none");
});
