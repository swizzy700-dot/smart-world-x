import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

    const batches = await prisma.intakeBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        batchCode: true,
        totalLines: true,
        validCount: true,
        insertedCount: true,
        duplicateCount: true,
        invalidCount: true,
        createdAt: true,
      },
    });

    return jsonOk({ batches });
  } catch (error) {
    return handleApiError(error);
  }
}
