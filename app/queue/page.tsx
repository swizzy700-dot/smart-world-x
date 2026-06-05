import { QueueMonitor } from "@/components/queue/queue-monitor";
import Link from "next/link";

export const metadata = {
  title: "Queue Monitor | SMART WORLD X",
  description: "Processing queue and job management",
};

export default function QueuePage() {
  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
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
            <span className="text-cyan-500">QUEUE</span>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <QueueMonitor />
      </main>
    </div>
  );
}
