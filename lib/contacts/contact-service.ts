import {
  ContactSource,
  ContactType,
  ExtractionStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { applyConfidence, extractContactsFromWebsite } from "./extract-engine";
import { PageFetchError } from "./fetch-page";
import type { ContactExtractionRecord, StoredContact } from "./types";

export class ContactError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ContactError";
  }
}

export async function runContactExtraction(
  websiteId: string,
  url: string,
): Promise<ContactExtractionRecord> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, domain: true, normalizedUrl: true },
  });

  if (!website) {
    throw new ContactError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const started = Date.now();

  const extraction = await prisma.contactExtraction.upsert({
    where: { websiteId },
    create: { websiteId, status: ExtractionStatus.RUNNING },
    update: {
      status: ExtractionStatus.RUNNING,
      errorMessage: null,
      emailCount: 0,
      phoneCount: 0,
      pagesScanned: 0,
    },
  });

  try {
    const result = await extractContactsFromWebsite(url);
    const durationMs = Date.now() - started;

    await prisma.contact.deleteMany({ where: { websiteId } });

    const emailHits = result.hits.filter((h) => h.type === ContactType.EMAIL);
    const phoneHits = result.hits.filter((h) => h.type === ContactType.PHONE);

    if (result.hits.length > 0) {
      let primaryEmailAssigned = false;
      await prisma.contact.createMany({
        data: result.hits.map((hit) => {
          const isPrimaryEmail =
            hit.type === ContactType.EMAIL && !primaryEmailAssigned;
          if (isPrimaryEmail) primaryEmailAssigned = true;

          return {
            websiteId,
            type: hit.type,
            value: hit.value,
            displayValue: hit.displayValue ?? hit.value,
            source: hit.source as ContactSource,
            sourceUrl: hit.sourceUrl,
            contactPageUrl: hit.contactPageUrl ?? result.contactPageUrl,
            confidence: applyConfidence(hit),
            isPrimary: isPrimaryEmail,
          };
        }),
        skipDuplicates: true,
      });
    }

    const finalStatus =
      result.hits.length === 0
        ? ExtractionStatus.NO_CONTACTS_FOUND
        : ExtractionStatus.COMPLETED;

    await prisma.contactExtraction.update({
      where: { id: extraction.id },
      data: {
        status: finalStatus,
        contactPageUrl: result.contactPageUrl,
        pagesScanned: result.pagesScanned,
        emailCount: emailHits.length,
        phoneCount: phoneHits.length,
        durationMs,
        extractedAt: new Date(),
        errorMessage: null,
      },
    });

    return getContactExtractionByWebsiteId(websiteId) as Promise<ContactExtractionRecord>;
  } catch (error) {
    const message =
      error instanceof PageFetchError
        ? `Failed to fetch ${error.url}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Contact extraction failed";

    await prisma.contactExtraction.update({
      where: { id: extraction.id },
      data: {
        status: ExtractionStatus.FAILED,
        errorMessage: message.slice(0, 2000),
        durationMs: Date.now() - started,
        extractedAt: new Date(),
      },
    });

    throw new ContactError(message, "EXTRACTION_FAILED");
  }
}

export async function getContactExtractionByWebsiteId(
  websiteId: string,
): Promise<ContactExtractionRecord | null> {
  const row = await prisma.contactExtraction.findUnique({
    where: { websiteId },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
    },
  });

  if (!row) return null;

  const contacts = await prisma.contact.findMany({
    where: { websiteId },
    orderBy: [{ isPrimary: "desc" }, { confidence: "desc" }],
  });

  return toRecord(row, contacts);
}

export async function listContactExtractions(params: {
  status?: ExtractionStatus;
  domain?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactExtractionWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.domain) {
    where.website = {
      domain: { contains: params.domain, mode: "insensitive" },
    };
  }

  const [rows, total] = await Promise.all([
    prisma.contactExtraction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { extractedAt: "desc" },
      include: {
        website: { select: { domain: true, normalizedUrl: true } },
      },
    }),
    prisma.contactExtraction.count({ where }),
  ]);

  return {
    extractions: rows.map((row) => ({
      id: row.id,
      websiteId: row.websiteId,
      domain: row.website.domain,
      normalizedUrl: row.website.normalizedUrl,
      status: row.status,
      contactPageUrl: row.contactPageUrl,
      emailCount: row.emailCount,
      phoneCount: row.phoneCount,
      extractedAt: row.extractedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

function toRecord(
  row: {
    id: string;
    websiteId: string;
    status: ExtractionStatus;
    contactPageUrl: string | null;
    pagesScanned: number;
    emailCount: number;
    phoneCount: number;
    errorMessage: string | null;
    extractedAt: Date | null;
    durationMs: number | null;
    website: { domain: string; normalizedUrl: string };
  },
  contacts: {
    id: string;
    type: ContactType;
    value: string;
    displayValue: string | null;
    source: ContactSource;
    sourceUrl: string;
    contactPageUrl: string | null;
    confidence: number;
    isPrimary: boolean;
    createdAt: Date;
  }[],
): ContactExtractionRecord {
  return {
    id: row.id,
    websiteId: row.websiteId,
    status: row.status,
    contactPageUrl: row.contactPageUrl,
    pagesScanned: row.pagesScanned,
    emailCount: row.emailCount,
    phoneCount: row.phoneCount,
    errorMessage: row.errorMessage,
    extractedAt: row.extractedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    website: row.website,
    contacts: contacts.map(
      (c): StoredContact => ({
        id: c.id,
        type: c.type,
        value: c.value,
        displayValue: c.displayValue,
        source: c.source,
        sourceUrl: c.sourceUrl,
        contactPageUrl: c.contactPageUrl,
        confidence: c.confidence,
        isPrimary: c.isPrimary,
        createdAt: c.createdAt.toISOString(),
      }),
    ),
  };
}
