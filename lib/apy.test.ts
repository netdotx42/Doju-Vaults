import assert from "node:assert/strict";
import test from "node:test";
import { compoundedGain, resolveHeadline } from "./apy";

test("unpublished stays unlabeled as a number", () => {
  const headline = resolveHeadline({
    mode: "unpublished",
    prefer30d: false,
    venueApy: 19,
    venueMean: 20,
    liveApy: 21,
    liveMean: 22,
    live: true,
  });
  assert.equal(headline.apyNumber, null);
  assert.equal(headline.apyText, "Variable");
  assert.equal(headline.source, "unpublished");
});

test("estimates are not replaced by a live pool", () => {
  const headline = resolveHeadline({
    mode: "estimated",
    prefer30d: false,
    venueApy: 18,
    venueMean: null,
    liveApy: 4,
    liveMean: 4,
    live: true,
  });
  assert.equal(headline.apyNumber, 18);
  assert.equal(headline.source, "estimate");
  assert.match(headline.apyText, /^Est\./);
});

test("volatile pools use the 30-day average", () => {
  const headline = resolveHeadline({
    mode: "pool",
    prefer30d: true,
    venueApy: 9.05,
    venueMean: 4.64,
    liveApy: 9.1,
    liveMean: 4.7,
    live: true,
  });
  assert.equal(headline.apyNumber, 4.7);
  assert.match(headline.caption, /30-day average/);
  assert.equal(headline.source, "live");
});

test("missing live feed is labeled as a snapshot", () => {
  const headline = resolveHeadline({
    mode: "pool",
    prefer30d: false,
    venueApy: 4.93,
    venueMean: 4.77,
    liveApy: null,
    liveMean: null,
    live: false,
  });
  assert.equal(headline.apyNumber, 4.93);
  assert.equal(headline.source, "snapshot");
  assert.match(headline.caption, /Snapshot/);
});

test("compounded gain for one year at 10%", () => {
  const gain = compoundedGain(100, 10, 365);
  assert.ok(Math.abs(gain - 10) < 0.001);
});
