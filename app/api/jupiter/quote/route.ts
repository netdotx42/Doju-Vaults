import { SOL_MINT } from "@/config/solana";
import { jupiterOutputMints } from "@/lib/research";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const outputMint = url.searchParams.get("outputMint") || "";
  const amount = url.searchParams.get("amount") || "";
  if (!jupiterOutputMints().includes(outputMint) || !/^\d+$/.test(amount)) {
    return Response.json({ error: "Unsupported swap." }, { status: 400 });
  }
  const quote = new URL("https://lite-api.jup.ag/swap/v1/quote");
  quote.searchParams.set("inputMint", SOL_MINT);
  quote.searchParams.set("outputMint", outputMint);
  quote.searchParams.set("amount", amount);
  quote.searchParams.set("slippageBps", "50");
  try {
    const response = await fetch(quote, { signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json({ error: "Jupiter quote failed." }, { status: 502 });
  }
}
