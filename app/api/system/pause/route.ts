import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  getSystemModeStatus,
  pauseSystem,
  SystemModeError,
} from "@/lib/system/system-mode";

export const runtime = "nodejs";

export async function POST() {
  try {
    await pauseSystem();
    const status = await getSystemModeStatus();
    return jsonOk(status);
  } catch (error) {
    if (error instanceof SystemModeError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
