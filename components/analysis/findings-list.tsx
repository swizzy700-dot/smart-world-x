import type { BusinessFinding, FindingSeverity } from "@/lib/analysis/types";

const severityStyles: Record<FindingSeverity, string> = {
  critical: "border-red-900/60 bg-red-950/20 text-red-300",
  high: "border-orange-900/50 bg-orange-950/15 text-orange-300",
  medium: "border-amber-900/50 bg-amber-950/15 text-amber-200",
  low: "border-cyan-900/40 bg-cyan-950/10 text-cyan-300",
  info: "border-cyan-900/30 bg-[#0a0e14] text-cyan-400",
};

interface FindingsListProps {
  findings: BusinessFinding[];
}

export function FindingsList({ findings }: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <p className="font-mono text-sm text-cyan-700">No findings recorded.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map((finding) => (
        <li
          key={finding.id}
          className={`rounded border px-4 py-3 ${severityStyles[finding.severity]}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
              {finding.severity}
            </span>
            <span className="font-mono text-[10px] text-cyan-600">
              {finding.category}
            </span>
            {finding.score !== undefined && (
              <span className="font-mono text-[10px] tabular-nums">
                {finding.score}/100
              </span>
            )}
          </div>
          <h3 className="mt-1 font-mono text-sm font-semibold">{finding.title}</h3>
          <p className="mt-1 text-sm leading-relaxed opacity-90">
            {finding.description}
          </p>
          <p className="mt-2 font-mono text-xs text-cyan-500/90">
            → {finding.recommendation}
          </p>
        </li>
      ))}
    </ul>
  );
}
