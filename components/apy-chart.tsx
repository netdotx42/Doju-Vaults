import type { ChartPoint } from "@/lib/types";

export function ApyChart({ points, caption }: { points: ChartPoint[]; caption: string }) {
  if (points.length < 2) {
    return (
      <p className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
        No APY history for this venue.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const pad = 28;
  const values = points.map((point) => point.apy);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const coords = points.map((point, index) => {
    const x = pad + (index / (points.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (point.apy - min) / span) * (height - pad * 2);
    return { x, y };
  });
  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${height - pad} L${coords[0].x.toFixed(1)},${height - pad} Z`;
  const latest = points[points.length - 1];

  return (
    <figure className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-neutral-400">{caption}</span>
        <span className="font-medium text-brand">{latest.apy.toFixed(2)}%</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`APY history. Latest ${latest.apy.toFixed(2)} percent on ${latest.t}.`}
        className="h-52 w-full"
      >
        <path d={area} fill="rgba(255,92,26,0.16)" />
        <path d={line} fill="none" stroke="#ff5c1a" strokeWidth="2.5" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>{points[0].t}</span>
        <span>{latest.t}</span>
      </div>
    </figure>
  );
}
