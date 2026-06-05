import { handleApiError, jsonOk } from "@/lib/api/response";
import { DeliveryError, queueOutboundEmail } from "@/lib/delivery/delivery-service";
import { queueEmailSchema } from "@/lib/delivery/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = queueEmailSchema.parse(body);
    const result = await queueOutboundEmail(input);
    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof DeliveryError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
