interface ScoreGaugeProps {
  label: string;
  score: number | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-cyan-700";
  if (score >= 90) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBorder(score: number | null): string {
  if (score === null) return "border-cyan-900/40";
  if (score >= 90) return "border-emerald-900/50";
  if (score >= 50) return "border-amber-900/50";
  return "border-red-900/50";
}

export function ScoreGauge({ label, score }: ScoreGaugeProps) {
  return (
    <div
      className={`rounded border bg-[#0d1219] px-4 py-3 ${scoreBorder(score)}`}
    >
      <p className="font-mono text-[10px] tracking-widest text-cyan-600">
        {label}
      </p>
      <p
        className={`font-mono text-3xl font-semibold tabular-nums ${scoreColor(score)}`}
      >
        {score ?? "—"}
      </p>
      {score !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cyan-950">
          <div
            className={`h-full transition-all ${
              score >= 90
                ? "bg-emerald-500"
                : score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}
