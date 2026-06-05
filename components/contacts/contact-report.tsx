"use client";

import { useEffect, useState } from "react";
import { fetchContacts } from "@/lib/contacts/client";
import type { ContactExtractionRecord, StoredContact } from "@/lib/contacts/types";

const sourceLabels: Record<string, string> = {
  MAILTO: "Mailto link",
  TEL: "Tel link",
  FOOTER: "Footer",
  HEADER: "Header / nav",
  CONTACT_PAGE: "Contact page",
  BODY: "Page body",
};

const statusColors: Record<string, string> = {
  COMPLETED: "text-emerald-400",
  NO_CONTACTS_FOUND: "text-amber-400",
  FAILED: "text-red-400",
  RUNNING: "text-cyan-400",
  PENDING: "text-cyan-600",
};

interface ContactReportProps {
  websiteId: string;
}

export function ContactReport({ websiteId }: ContactReportProps) {
  const [data, setData] = useState<ContactExtractionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts(websiteId)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [websiteId]);

  if (loading) {
    return (
      <p className="font-mono text-sm text-cyan-600 animate-pulse">
        Loading contacts…
      </p>
    );
  }

  if (error || !data) {
    return (
      <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
        {error ?? "No extraction record. Run the worker to process this site."}
      </p>
    );
  }

  const emails = data.contacts.filter((c) => c.type === "EMAIL");
  const phones = data.contacts.filter((c) => c.type === "PHONE");

  return (
    <div className="space-y-6">
      <header className="border-b border-cyan-900/40 pb-4">
        <p className="font-mono text-[10px] tracking-widest text-cyan-600">
          {data.website.domain}
        </p>
        <h1 className="font-mono text-xl font-semibold text-cyan-50">
          CONTACT EXTRACTION
        </h1>
        <p className={`mt-1 font-mono text-xs ${statusColors[data.status] ?? ""}`}>
          Status: {data.status}
          {data.extractedAt &&
            ` · ${new Date(data.extractedAt).toLocaleString()}`}
          {data.durationMs != null && ` · ${data.durationMs}ms`}
        </p>
      </header>

      {data.status === "FAILED" && data.errorMessage && (
        <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
          {data.errorMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="PAGES SCANNED" value={data.pagesScanned} />
        <Stat label="EMAILS" value={data.emailCount} />
        <Stat label="PHONES" value={data.phoneCount} />
        <Stat
          label="CONTACT PAGE"
          value={data.contactPageUrl ? "Found" : "—"}
          sub={data.contactPageUrl ?? undefined}
        />
      </div>

      {data.contactPageUrl && (
        <div className="rounded border border-cyan-900/40 bg-[#0d1219] px-4 py-3">
          <p className="font-mono text-[10px] text-cyan-600">CONTACT PAGE URL</p>
          <a
            href={data.contactPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 break-all font-mono text-sm text-cyan-300 hover:underline"
          >
            {data.contactPageUrl}
          </a>
        </div>
      )}

      <ContactSection title="EMAILS" items={emails} />
      <ContactSection title="PHONE NUMBERS" items={phones} />

      {data.status === "NO_CONTACTS_FOUND" && (
        <p className="font-mono text-sm text-amber-400">
          No public email or phone found on homepage, header, footer, or contact
          pages.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded border border-cyan-900/40 bg-[#0d1219] px-3 py-2">
      <p className="font-mono text-[10px] text-cyan-600">{label}</p>
      <p className="font-mono text-xl font-semibold text-cyan-100">{value}</p>
      {sub && (
        <p className="mt-1 truncate font-mono text-[10px] text-cyan-600" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ContactSection({
  title,
  items,
}: {
  title: string;
  items: StoredContact[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 font-mono text-[10px] tracking-widest text-cyan-600">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="rounded border border-cyan-900/40 bg-[#0d1219] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              {c.isPrimary && (
                <span className="rounded bg-emerald-950/50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                  PRIMARY
                </span>
              )}
              <span className="font-mono text-[10px] text-cyan-600">
                {sourceLabels[c.source] ?? c.source} · {c.confidence}%
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-cyan-100">{c.value}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-cyan-700" title={c.sourceUrl}>
              Source: {c.sourceUrl}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
