import { fetchChart } from "@/lib/live";
import { trackedPoolIds } from "@/lib/research";

export const revalidate = 300;

export async function GET(
  _request: Request,
  context: { params: Promise<{ poolId: string }> },
) {
  const { poolId } = await context.params;
  if (!trackedPoolIds().includes(poolId)) {
    return Response.json({ error: "Unknown pool" }, { status: 404 });
  }
  const points = await fetchChart(poolId);
  return Response.json({ points });
}
