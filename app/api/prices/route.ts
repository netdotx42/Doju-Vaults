import { fetchPrices } from "@/lib/live";

export const revalidate = 60;

export async function GET() {
  const prices = await fetchPrices();
  return Response.json({ prices });
}
