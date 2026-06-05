import type { IntakeStats } from "@/lib/intake/types";

interface StatsBarProps {
  stats: IntakeStats | null;
  inserted?: number;
  queued?: number;
  loading?: boolean;
}

const tiles: {
  key: keyof IntakeStats | "inserted" | "queued";
  label: string;
}[] = [
  { key: "totalLines", label: "LINES" },
  { key: "valid", label: "VALID" },
  { key: "invalid", label: "INVALID" },
  { key: "duplicateBatch", label: "DUP BATCH" },
  { key: "duplicateDb", label: "DUP DB" },
  { key: "readyToInsert", label: "READY" },
];

export function StatsBar({ stats, inserted, queued, loading }: StatsBarProps) {
  const extended = stats
    ? { ...stats, inserted: inserted ?? 0, queued: queued ?? 0 }
    : null;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {tiles.map(({ key, label }) => (
        <div
          key={key}
          className="rounded border border-cyan-900/40 bg-[#0d1219] px-3 py-2"
        >
          <p className="font-mono text-[10px] tracking-widest text-cyan-600/80">
            {label}
          </p>
          <p className="font-mono text-xl font-semibold text-cyan-100 tabular-nums">
            {loading ? "—" : (extended?.[key] ?? 0)}
          </p>
        </div>
      ))}
      {inserted !== undefined && (
        <div className="rounded border border-emerald-900/40 bg-[#0d1219] px-3 py-2">
          <p className="font-mono text-[10px] tracking-widest text-emerald-600/80">
            INSERTED
          </p>
          <p className="font-mono text-xl font-semibold text-emerald-300 tabular-nums">
            {inserted}
          </p>
        </div>
      )}
      {queued !== undefined && (
        <div className="rounded border border-amber-900/40 bg-[#0d1219] px-3 py-2">
          <p className="font-mono text-[10px] tracking-widest text-amber-600/80">
            QUEUED
          </p>
          <p className="font-mono text-xl font-semibold text-amber-200 tabular-nums">
            {queued}
          </p>
        </div>
      )}
    </div>
  );
}
