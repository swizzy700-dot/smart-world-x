"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchWebsiteEmails,
  queueEmailSend,
  retryEmail,
} from "@/lib/delivery/client";
import type { EmailMessageRecord } from "@/lib/delivery/types";

const statusColors: Record<string, string> = {
  PENDING: "text-amber-400",
  SENDING: "text-cyan-400",
  SENT: "text-emerald-400",
  FAILED: "text-red-400",
};

interface DeliveryPanelProps {
  websiteId: string;
  recipientEmail?: string | null;
  canSend?: boolean;
}

export function DeliveryPanel({
  websiteId,
  recipientEmail,
  canSend = true,
}: DeliveryPanelProps) {
  const [messages, setMessages] = useState<EmailMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWebsiteEmails(websiteId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await fetchWebsiteEmails(websiteId);
        setMessages(data);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [websiteId]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await queueEmailSend({ websiteId });
      setSuccess(`Email queued to ${result.toAddress}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue email");
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (messageId: string) => {
    setActionId(messageId);
    setError(null);
    try {
      await retryEmail(messageId);
      setSuccess("Retry queued");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4 rounded border border-violet-900/40 bg-[#0d1219] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-widest text-violet-400">
          EMAIL DELIVERY
        </p>
        {canSend && (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !recipientEmail}
            className="rounded border border-violet-500/50 bg-violet-950/40 px-3 py-1.5 font-mono text-[10px] text-violet-100 hover:bg-violet-900/40 disabled:opacity-40"
          >
            {sending ? "QUEUING…" : "QUEUE SEND →"}
          </button>
        )}
      </div>

      {!recipientEmail && canSend && (
        <p className="font-mono text-xs text-amber-500">
          No recipient email — extract contacts first.
        </p>
      )}

      {error && (
        <p className="font-mono text-xs text-red-400">{error}</p>
      )}
      {success && (
        <p className="font-mono text-xs text-emerald-400">{success}</p>
      )}

      {loading ? (
        <p className="font-mono text-xs text-cyan-700">Loading delivery log…</p>
      ) : messages.length === 0 ? (
        <p className="font-mono text-xs text-cyan-700">No emails sent yet.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className="rounded border border-cyan-950/60 bg-[#0a0e14] px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-mono text-xs font-semibold ${statusColors[msg.status] ?? ""}`}
                >
                  {msg.status}
                </span>
                <span className="font-mono text-[10px] text-cyan-600">
                  {msg.attempts}/{msg.maxAttempts} attempts
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-cyan-200">{msg.subject}</p>
              <p className="font-mono text-[10px] text-cyan-600">
                To: {msg.toAddress}
                {msg.sentAt && ` · Sent ${new Date(msg.sentAt).toLocaleString()}`}
              </p>
              {msg.lastError && (
                <p className="mt-1 font-mono text-[10px] text-red-400">
                  {msg.lastError}
                </p>
              )}
              {msg.status === "FAILED" && (
                <button
                  type="button"
                  disabled={actionId === msg.id}
                  onClick={() => handleRetry(msg.id)}
                  className="mt-2 rounded border border-amber-800/50 px-2 py-0.5 font-mono text-[10px] text-amber-300 disabled:opacity-40"
                >
                  RETRY
                </button>
              )}

              {msg.activities.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-mono text-[10px] text-cyan-600">
                    Activity ({msg.activities.length})
                  </summary>
                  <ul className="mt-1 space-y-1 border-l border-cyan-900/40 pl-2">
                    {msg.activities.map((a) => (
                      <li key={a.id} className="font-mono text-[10px] text-cyan-700">
                        <span className="text-cyan-500">{a.type}</span> — {a.message}
                        <span className="ml-1 opacity-60">
                          {new Date(a.createdAt).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
