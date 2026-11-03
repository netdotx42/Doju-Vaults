import { SOL_MINT } from "@/config/solana";
import { jupiterOutputMints } from "@/lib/research";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    quoteResponse?: { inputMint?: string; outputMint?: string };
    userPublicKey?: string;
  };
  const input = body.quoteResponse?.inputMint;
  const output = body.quoteResponse?.outputMint;
  if (input !== SOL_MINT || !output || !jupiterOutputMints().includes(output)) {
    return Response.json({ error: "Unsupported swap." }, { status: 400 });
  }
  if (!body.userPublicKey) {
    return Response.json({ error: "Missing wallet." }, { status: 400 });
  }
  try {
    const response = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: body.quoteResponse,
        userPublicKey: body.userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json({ error: "Jupiter swap failed." }, { status: 502 });
  }
}
