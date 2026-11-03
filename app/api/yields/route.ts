import { getMarkets } from "@/lib/live";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getMarkets();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
