import { handleApiError, jsonOk } from "@/lib/api/response";
import { getMonitoringData } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMonitoringData();
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}