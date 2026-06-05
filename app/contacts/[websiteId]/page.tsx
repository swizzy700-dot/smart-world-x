import { ContactReport } from "@/components/contacts/contact-report";
import Link from "next/link";

export const metadata = {
  title: "Contacts | SMART WORLD X",
};

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/queue"
            className="font-mono text-sm text-cyan-500 hover:text-cyan-300"
          >
            ← QUEUE
          </Link>
          <div className="flex gap-4 font-mono text-[10px] text-cyan-700">
            <Link
              href={`/analysis/${websiteId}`}
              className="hover:text-cyan-400"
            >
              ANALYSIS
            </Link>
            <span className="text-cyan-500">CONTACTS</span>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <ContactReport websiteId={websiteId} />
      </main>
    </div>
  );
}
