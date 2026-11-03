"use client";

import { useId } from "react";

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) {
    return <span className="text-xs text-neutral-500">No 30-day line</span>;
  }
  const width = 112;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 3 - ((value - min) / span) * (height - 6);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28 shrink-0" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor={up ? "#ff5c1a" : "#a78bfa"} />
        </linearGradient>
      </defs>
      <path d={line} fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
