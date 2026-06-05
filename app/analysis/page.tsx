import { AnalysisIndex } from "@/components/analysis/analysis-index";
import Link from "next/link";

export const metadata = {
  title: "Analysis Reports | SMART WORLD X",
};

export default function AnalysisListPage() {
  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm tracking-widest text-cyan-500 hover:text-cyan-300"
          >
            ◈ SMART WORLD X
          </Link>
          <div className="flex gap-4 font-mono text-[10px] text-cyan-700">
            <Link href="/intake" className="hover:text-cyan-400">
              INTAKE
            </Link>
            <Link href="/queue" className="hover:text-cyan-400">
              QUEUE
            </Link>
            <span className="text-cyan-500">ANALYSIS</span>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <AnalysisIndex />
      </main>
    </div>
  );
}
