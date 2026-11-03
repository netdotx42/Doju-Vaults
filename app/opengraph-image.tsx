import { ImageResponse } from "next/og";

export const alt = "Doju Vaults";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
        }}
      >
        <div style={{ color: "#ff5c1a", fontSize: 28, letterSpacing: 6 }}>DOJU VAULTS</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Solana yield, plainly.</div>
          <div style={{ marginTop: 20, fontSize: 28, color: "#a3a3a3" }}>
            LSTs, stables, real-world assets, and DePIN.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
