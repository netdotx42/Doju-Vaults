type Plausible = (
  event: string,
  options?: { props?: Record<string, string | number | boolean> },
) => void;

/** Fire a product event if Plausible or gtag is on the page. No-op otherwise. */
export function track(
  event: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    plausible?: Plausible;
    gtag?: (...args: unknown[]) => void;
  };
  w.plausible?.(event, props ? { props } : undefined);
  w.gtag?.("event", event, props ?? {});
}
