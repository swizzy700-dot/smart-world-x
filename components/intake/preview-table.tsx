import type { IntakePreviewItem } from "@/lib/intake/types";

const outcomeStyles: Record<
  IntakePreviewItem["outcome"],
  { label: string; className: string }
> = {
  valid: { label: "VALID", className: "text-emerald-400" },
  invalid: { label: "INVALID", className: "text-red-400" },
  duplicate_batch: { label: "DUP", className: "text-amber-400" },
  duplicate_db: { label: "EXISTS", className: "text-amber-300" },
};

interface PreviewTableProps {
  items: IntakePreviewItem[];
  maxRows?: number;
}

export function PreviewTable({ items, maxRows = 200 }: PreviewTableProps) {
  const visible = items.slice(0, maxRows);
  const truncated = items.length > maxRows;

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded border border-dashed border-cyan-900/30 bg-[#0a0e14]/50 p-8">
        <p className="font-mono text-sm text-cyan-700">
          Paste URLs to preview validation
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded border border-cyan-900/40 bg-[#0a0e14]/80">
      <div className="border-b border-cyan-900/40 px-3 py-2">
        <p className="font-mono text-[10px] tracking-widest text-cyan-600">
          VALIDATION PREVIEW
          {truncated && (
            <span className="ml-2 text-amber-500">
              (showing {maxRows} of {items.length})
            </span>
          )}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="sticky top-0 bg-[#0d1219] text-cyan-600">
            <tr>
              <th className="px-3 py-2 font-normal">#</th>
              <th className="px-3 py-2 font-normal">STATUS</th>
              <th className="px-3 py-2 font-normal">DOMAIN</th>
              <th className="px-3 py-2 font-normal">INPUT</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const style = outcomeStyles[item.outcome];
              return (
                <tr
                  key={`${item.lineNumber}-${item.raw}`}
                  className="border-t border-cyan-950/60 hover:bg-cyan-950/20"
                >
                  <td className="px-3 py-1.5 text-cyan-700 tabular-nums">
                    {item.lineNumber}
                  </td>
                  <td className={`px-3 py-1.5 ${style.className}`}>
                    {style.label}
                  </td>
                  <td className="px-3 py-1.5 text-cyan-200">
                    {item.domain ?? "—"}
                  </td>
                  <td
                    className="max-w-[200px] truncate px-3 py-1.5 text-cyan-400/80"
                    title={item.reason ?? item.raw}
                  >
                    {item.reason ?? item.raw}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
