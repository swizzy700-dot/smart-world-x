import { IntakeModule } from "@/components/intake/intake-module";
import Link from "next/link";

export const metadata = {
  title: "Website Intake | SMART WORLD X",
  description: "Bulk URL submission for outreach intelligence",
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm tracking-widest text-cyan-500 hover:text-cyan-300"
          >
            ◈ SMART WORLD X
          </Link>
          <div className="flex gap-4 font-mono text-[10px] text-cyan-700">
            <span className="text-cyan-500">INTAKE</span>
            <Link href="/queue" className="hover:text-cyan-400">
              QUEUE
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <IntakeModule />
      </main>
    </div>
  );
}
