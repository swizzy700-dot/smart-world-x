import { previewIntake } from "@/lib/intake/ingest-service";
import { intakePreviewSchema } from "@/lib/intake/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input } = intakePreviewSchema.parse(body);
    const result = await previewIntake(input);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
