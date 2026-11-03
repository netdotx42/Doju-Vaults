/** Match the on-chain rounding: division floors, first deposit is 1:1. */
export function sharesForDeposit(assets: bigint, totalAssets: bigint, supply: bigint): bigint {
  if (assets <= 0n) return 0n;
  if (totalAssets === 0n) return supply === 0n ? assets : 0n;
  if (supply === 0n) return 0n;
  return (assets * supply) / totalAssets;
}

export function assetsForShares(shares: bigint, totalAssets: bigint, supply: bigint): bigint {
  if (shares <= 0n || supply <= 0n) return 0n;
  return (shares * totalAssets) / supply;
}
