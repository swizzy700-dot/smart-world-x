"use client";

import { useEffect, useState } from "react";
import { DeliveryPanel } from "@/components/delivery/delivery-panel";
import {
  fetchOutreach,
  regenerateOutreach,
} from "@/lib/outreach/client";
import type { OutreachDraftRecord } from "@/lib/outreach/types";

const statusColors: Record<string, string> = {
  GENERATED: "text-emerald-400",
  GENERATING: "text-cyan-400",
  FAILED: "text-red-400",
  PENDING: "text-cyan-600",
};

interface OutreachViewProps {
  websiteId: string;
}

export function OutreachView({ websiteId }: OutreachViewProps) {
  const [draft, setDraft] = useState<OutreachDraftRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOutreach(websiteId);
        setDraft(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setDraft(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [websiteId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const data = await regenerateOutreach(websiteId);
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const copy = async (text: string, field: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <p className="font-mono text-sm text-cyan-600 animate-pulse">
        Loading outreach…
      </p>
    );
  }

  if (error && !draft) {
    return (
      <div className="space-y-4">
        <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="rounded border border-cyan-500/50 px-4 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-950/40 disabled:opacity-40"
        >
          {regenerating ? "GENERATING…" : "GENERATE OUTREACH"}
        </button>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-cyan-600">
            {draft.website.domain}
          </p>
          <h1 className="font-mono text-xl font-semibold text-cyan-50">
            OUTREACH DRAFT
          </h1>
          <p
            className={`mt-1 font-mono text-xs ${statusColors[draft.status] ?? ""}`}
          >
            v{draft.version} · {draft.status} · {draft.provider}
            {draft.providerModel && ` (${draft.providerModel})`}
            {draft.generatedAt &&
              ` · ${new Date(draft.generatedAt).toLocaleString()}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating || draft.status === "GENERATING"}
          className="rounded border border-amber-800/60 px-3 py-1.5 font-mono text-[10px] text-amber-300 hover:bg-amber-950/30 disabled:opacity-40"
        >
          {regenerating ? "REGENERATING…" : "REGENERATE"}
        </button>
      </header>

      {error && (
        <p className="font-mono text-xs text-red-400">{error}</p>
      )}

      {draft.status === "FAILED" && draft.errorMessage && (
        <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
          {draft.errorMessage}
        </p>
      )}

      {draft.recipientEmail && (
        <div className="rounded border border-cyan-900/40 bg-[#0d1219] px-4 py-2">
          <p className="font-mono text-[10px] text-cyan-600">RECIPIENT</p>
          <p className="font-mono text-sm text-cyan-100">{draft.recipientEmail}</p>
        </div>
      )}

      {draft.status === "GENERATED" && draft.subject && draft.body && (
        <>
          <section className="rounded border border-cyan-900/40 bg-[#0d1219]">
            <div className="flex items-center justify-between border-b border-cyan-900/40 px-4 py-2">
              <p className="font-mono text-[10px] tracking-widest text-cyan-600">
                SUBJECT LINE
              </p>
              <button
                type="button"
                onClick={() => copy(draft.subject!, "subject")}
                className="font-mono text-[10px] text-cyan-500 hover:text-cyan-300"
              >
                {copied === "subject" ? "COPIED" : "COPY"}
              </button>
            </div>
            <p className="px-4 py-3 font-mono text-sm text-cyan-50">
              {draft.subject}
            </p>
          </section>

          <section className="rounded border border-cyan-900/40 bg-[#0d1219]">
            <div className="flex items-center justify-between border-b border-cyan-900/40 px-4 py-2">
              <p className="font-mono text-[10px] tracking-widest text-cyan-600">
                MESSAGE
              </p>
              <button
                type="button"
                onClick={() => copy(draft.body!, "body")}
                className="font-mono text-[10px] text-cyan-500 hover:text-cyan-300"
              >
                {copied === "body" ? "COPIED" : "COPY"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-cyan-100/90">
              {draft.body}
            </pre>
          </section>

          <DeliveryPanel
            websiteId={websiteId}
            recipientEmail={draft.recipientEmail}
            canSend={draft.status === "GENERATED"}
          />
        </>
      )}
    </div>
  );
}
