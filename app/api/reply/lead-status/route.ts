import { handleApiError, jsonOk } from "@/lib/api/response";
import { getLeadStatusStats } from "@/lib/reply/lead-status-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("websiteId");

    if (websiteId) {
      // Get lead status for a specific website
      const { prisma } = await import("@/lib/db");
      const website = await prisma.website.findUnique({
        where: { id: websiteId },
        select: { leadStatus: true },
      });

      if (!website) {
        return handleApiError(new Error("Website not found"));
      }

      return jsonOk({ leadStatus: website.leadStatus });
    }

    // Get overall lead status statistics
    const stats = await getLeadStatusStats();
    return jsonOk(stats);
  } catch (error) {
    return handleApiError(error);
  }
}