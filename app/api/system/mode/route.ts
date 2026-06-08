import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  canUseRedisRead,
  getSystemModeStatusForReads,
} from "@/lib/system/redis-read-guard";
import { getSystemModeStatus } from "@/lib/system/system-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await canUseRedisRead())) {
      return jsonOk(getSystemModeStatusForReads());
    }
    const status = await getSystemModeStatus();
    return jsonOk(status);
  } catch (error) {
    return jsonOk(getSystemModeStatusForReads());
  }
}
