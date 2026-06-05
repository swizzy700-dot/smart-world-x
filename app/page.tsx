import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070b10] px-6">
      <p className="font-mono text-[10px] tracking-[0.4em] text-cyan-600">
        SMART WORLD X
      </p>
      <h1 className="mt-2 font-mono text-3xl font-semibold text-cyan-50">
        Outreach Intelligence Platform
      </h1>
      <p className="mt-4 max-w-md text-center font-mono text-sm text-cyan-700">
        Submit websites for processing. Discovery is manual — the platform
        handles intake, queueing, and analysis.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/intake"
          className="rounded border border-cyan-500/50 bg-cyan-950/40 px-6 py-3 font-mono text-sm tracking-widest text-cyan-100 transition hover:bg-cyan-900/40"
        >
          WEBSITE INTAKE →
        </Link>
        <Link
          href="/queue"
          className="rounded border border-amber-500/40 bg-amber-950/20 px-6 py-3 font-mono text-sm tracking-widest text-amber-100 transition hover:bg-amber-900/30"
        >
          QUEUE MONITOR →
        </Link>
        <Link
          href="/analysis"
          className="rounded border border-emerald-500/40 bg-emerald-950/20 px-6 py-3 font-mono text-sm tracking-widest text-emerald-100 transition hover:bg-emerald-900/30"
        >
          ANALYSIS REPORTS →
        </Link>
        <Link
          href="/delivery"
          className="rounded border border-violet-500/40 bg-violet-950/20 px-6 py-3 font-mono text-sm tracking-widest text-violet-100 transition hover:bg-violet-900/30"
        >
          EMAIL DELIVERY →
        </Link>
      </div>
      <p className="mt-6 max-w-md text-center font-mono text-xs text-cyan-800">
        Pipeline: intake → queue → analysis → contacts → outreach → delivery
      </p>
    </div>
  );
}
