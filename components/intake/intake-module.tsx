"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  executeIntakeClient,
  previewIntakeClient,
} from "@/lib/intake/client";
import type { IntakePreviewResult, IntakeStats } from "@/lib/intake/types";
import { INTAKE_MAX_BATCH_SIZE } from "@/lib/intake/constants";
import { PreviewTable } from "./preview-table";
import { RecentBatches } from "./recent-batches";
import { StatsBar } from "./stats-bar";

export function IntakeModule() {
  const [input, setInput] = useState("");
  const [autoQueue, setAutoQueue] = useState(true);
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState<IntakePreviewResult | null>(null);
  const [stats, setStats] = useState<IntakeStats | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    batchCode: string;
    inserted: number;
    queued: number;
  } | null>(null);
  const [batchKey, setBatchKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      setStats(null);
      return;
    }

    setPreviewLoading(true);
    setError(null);

    try {
      const result = await previewIntakeClient(text);
      setPreview(result);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreview(null);
      setStats(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runPreview(input);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runPreview]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setInput((prev) => (prev ? `${prev}\n${text}` : text));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExecute = async () => {
    if (!input.trim()) {
      setError("Paste at least one URL");
      return;
    }

    if ((stats?.readyToInsert ?? 0) === 0 && preview) {
      setError("No new URLs ready to insert");
      return;
    }

    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const result = await executeIntakeClient(input, {
        autoQueue,
        tags: tagList,
      });

      setSuccess({
        batchCode: result.batchCode,
        inserted: result.stats.inserted,
        queued: result.stats.queued,
      });
      setStats(result.stats);
      setBatchKey((k) => k + 1);
      setInput("");
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setExecuting(false);
    }
  };

  const lineCount = input.split(/[\r\n,;\t]+/).filter((l) => l.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / INTAKE
          </p>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-cyan-50">
            WEBSITE INTAKE
          </h1>
        </div>
        <p className="font-mono text-xs text-cyan-600">
          MAX BATCH: {INTAKE_MAX_BATCH_SIZE.toLocaleString()} · LINES:{" "}
          <span className="text-cyan-300">{lineCount}</span>
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-900/50 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded border border-emerald-900/50 bg-emerald-950/30 px-4 py-2 font-mono text-sm text-emerald-300"
        >
          Batch {success.batchCode} — {success.inserted} inserted,{" "}
          {success.queued} queued for processing
        </div>
      )}

      <StatsBar
        stats={stats}
        inserted={success?.inserted}
        queued={success?.queued}
        loading={previewLoading && !stats}
      />

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-1 flex-col rounded border border-cyan-900/40 bg-[#0d1219]">
            <div className="flex items-center justify-between border-b border-cyan-900/40 px-3 py-2">
              <p className="font-mono text-[10px] tracking-widest text-cyan-600">
                SUBMIT PAYLOAD
              </p>
              <div className="flex gap-2">
                <label className="cursor-pointer rounded border border-cyan-800/60 px-2 py-1 font-mono text-[10px] text-cyan-400 hover:bg-cyan-950/40">
                  UPLOAD CSV
                  <input
                    type="file"
                    accept=".csv,.txt,text/plain"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    setPreview(null);
                    setStats(null);
                    setError(null);
                  }}
                  className="rounded border border-cyan-800/60 px-2 py-1 font-mono text-[10px] text-cyan-500 hover:bg-cyan-950/40"
                >
                  CLEAR
                </button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`https://example.com\nhttps://another-site.io\none-url-per-line`}
              className="min-h-[280px] flex-1 resize-y bg-transparent p-3 font-mono text-sm text-cyan-100 placeholder:text-cyan-900 focus:outline-none"
              spellCheck={false}
            />
          </div>

          <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-3">
            <p className="mb-2 font-mono text-[10px] tracking-widest text-cyan-600">
              OPTIONS
            </p>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-cyan-300">
              <input
                type="checkbox"
                checked={autoQueue}
                onChange={(e) => setAutoQueue(e.target.checked)}
                className="accent-cyan-500"
              />
              Auto-queue processing jobs on submit
            </label>
            <div className="mt-3">
              <label className="font-mono text-[10px] text-cyan-600">
                TAGS (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="prospect, q2"
                className="mt-1 w-full rounded border border-cyan-900/50 bg-[#0a0e14] px-2 py-1.5 font-mono text-xs text-cyan-200 focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={
              executing ||
              previewLoading ||
              !input.trim() ||
              (stats !== null && stats.readyToInsert === 0)
            }
            className="w-full rounded border border-cyan-500/60 bg-cyan-950/50 py-3 font-mono text-sm font-semibold tracking-widest text-cyan-100 transition hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {executing ? "EXECUTING…" : "EXECUTE INGEST →"}
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <PreviewTable items={preview?.items ?? []} />
          </div>
          <RecentBatches key={batchKey} />
        </div>
      </div>
    </div>
  );
}
