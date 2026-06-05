import { executeIntake } from "@/lib/intake/ingest-service";
import { intakeExecuteSchema } from "@/lib/intake/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input, autoQueue, tags } = intakeExecuteSchema.parse(body);
    const result = await executeIntake(input, { autoQueue, tags });
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
