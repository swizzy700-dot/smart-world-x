import {
  AnalysisError,
  getAnalysisByWebsiteId,
} from "@/lib/analysis/analysis-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const { websiteId } = await params;
    const analysis = await getAnalysisByWebsiteId(websiteId);

    if (!analysis) {
      return jsonError("Analysis not found", 404, "ANALYSIS_NOT_FOUND");
    }

    return jsonOk(analysis);
  } catch (error) {
    if (error instanceof AnalysisError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
