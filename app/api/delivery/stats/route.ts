import { handleApiError, jsonOk } from "@/lib/api/response";
import { getDeliveryStats } from "@/lib/delivery/delivery-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDeliveryStats();
    return jsonOk(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
