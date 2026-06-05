import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export class LeadStatusError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LeadStatusError";
  }
}

/**
 * Update lead status based on reply detection
 */
export async function updateLeadStatusOnReply(
  websiteId: string,
): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new LeadStatusError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const currentStatus = website.leadStatus;
  let newStatus: LeadStatus;

  // Lead status progression logic
  switch (currentStatus) {
    case LeadStatus.NEW:
      newStatus = LeadStatus.REPLIED;
      break;
    case LeadStatus.CONTACTED:
      newStatus = LeadStatus.REPLIED;
      break;
    case LeadStatus.REPLIED:
      newStatus = LeadStatus.ENGAGED;
      break;
    case LeadStatus.ENGAGED:
      newStatus = LeadStatus.ENGAGED; // Stay engaged
      break;
    case LeadStatus.CONVERTED:
      newStatus = LeadStatus.CONVERTED; // Stay converted
      break;
    default:
      newStatus = LeadStatus.REPLIED;
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { leadStatus: newStatus },
  });
}

/**
 * Update lead status to CONTACTED when initial email is sent
 */
export async function updateLeadStatusOnContacted(
  websiteId: string,
): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new LeadStatusError("Website not found", "WEBSITE_NOT_FOUND");
  }

  // Only update if current status is NEW
  if (website.leadStatus === LeadStatus.NEW) {
    await prisma.website.update({
      where: { id: websiteId },
      data: { leadStatus: LeadStatus.CONTACTED },
    });
  }
}

/**
 * Manually set lead status
 */
export async function setLeadStatus(
  websiteId: string,
  status: LeadStatus,
): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new LeadStatusError("Website not found", "WEBSITE_NOT_FOUND");
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { leadStatus: status },
  });
}

/**
 * Get lead status statistics
 */
export async function getLeadStatusStats(): Promise<
  Record<LeadStatus, number>
> {
  const groups = await prisma.website.groupBy({
    by: ["leadStatus"],
    _count: { _all: true },
  });

  const stats = {
    [LeadStatus.NEW]: 0,
    [LeadStatus.CONTACTED]: 0,
    [LeadStatus.REPLIED]: 0,
    [LeadStatus.ENGAGED]: 0,
    [LeadStatus.CONVERTED]: 0,
  };

  for (const group of groups) {
    stats[group.leadStatus] = group._count._all;
  }

  return stats;
}
