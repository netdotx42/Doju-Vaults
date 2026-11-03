import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Doju Vaults", template: "%s · Doju Vaults" },
  description:
    "Solana yield vaults for liquid staking, stablecoins, real-world assets, and DePIN. Live rates, wallet connect, deposit and withdraw.",
  applicationName: "Doju Vaults",
  openGraph: {
    title: "Doju Vaults",
    description: "Solana yield, plainly.",
    siteName: "Doju Vaults",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doju Vaults",
    description: "Solana yield, plainly.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
        {plausible ? (
          <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" />
        ) : null}
      </body>
    </html>
  );
}
