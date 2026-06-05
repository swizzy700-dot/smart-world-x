import { AnalysisReport } from "@/components/analysis/analysis-report";
import Link from "next/link";

export const metadata = {
  title: "Site Analysis | SMART WORLD X",
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/analysis"
            className="font-mono text-sm text-cyan-500 hover:text-cyan-300"
          >
            ← REPORTS
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <AnalysisReport websiteId={websiteId} />
      </main>
    </div>
  );
}
