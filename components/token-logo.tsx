"use client";

import { useState } from "react";

export function TokenLogo({
  symbol,
  iconUrl,
  size = 40,
}: {
  symbol: string;
  iconUrl: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!iconUrl || failed) {
    return (
      <span
        aria-hidden
        style={style}
        className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet-300 text-[11px] font-bold text-black"
      >
        {symbol.slice(0, 3)}
      </span>
    );
  }
  return (
    // Token logos come from many CDNs. next/image would need each host allowlisted.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      width={size}
      height={size}
      style={style}
      className="shrink-0 rounded-full bg-neutral-900 object-cover"
      onError={() => setFailed(true)}
    />
  );
}
