import { NextResponse } from "next/server";
import { IntakeError } from "@/lib/intake/ingest-service";
import { AnalysisError } from "@/lib/analysis/analysis-service";
import { ContactError } from "@/lib/contacts/contact-service";
import { DeliveryError } from "@/lib/delivery/delivery-service";
import { OutreachError } from "@/lib/outreach/outreach-service";
import { QueueError } from "@/lib/queue/queue-service";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown,
) {
  return NextResponse.json(
    { success: false, error: { message, code, details } },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(
      error.issues.map((i) => i.message).join("; "),
      400,
      "VALIDATION_ERROR",
      error.flatten(),
    );
  }

  if (error instanceof IntakeError) {
    return jsonError(error.message, 400, error.code);
  }

  if (error instanceof ContactError) {
    const status =
      error.code === "WEBSITE_NOT_FOUND" ? 404 : 500;
    return jsonError(error.message, status, error.code);
  }

  if (error instanceof DeliveryError) {
    const status =
      error.code === "WEBSITE_NOT_FOUND" || error.code === "NOT_FOUND"
        ? 404
        : error.code === "ALREADY_SENT" ||
            error.code === "SENDING" ||
            error.code === "ALREADY_QUEUED"
          ? 409
          : error.code === "SMTP_NOT_CONFIGURED" ||
              error.code === "NO_OUTREACH_DRAFT" ||
              error.code === "NO_RECIPIENT"
            ? 400
            : 500;
    return jsonError(error.message, status, error.code);
  }

  if (error instanceof OutreachError) {
    const status =
      error.code === "WEBSITE_NOT_FOUND" ? 404 : 500;
    return jsonError(error.message, status, error.code);
  }

  if (error instanceof AnalysisError) {
    const status =
      error.code === "WEBSITE_NOT_FOUND" ? 404 : 500;
    return jsonError(error.message, status, error.code);
  }

  if (error instanceof QueueError) {
    const status =
      error.code === "JOB_NOT_FOUND" || error.code === "WEBSITE_NOT_FOUND"
        ? 404
        : 409;
    return jsonError(error.message, status, error.code);
  }

  console.error("[api]", error);
  return jsonError("Internal server error", 500, "INTERNAL_ERROR");
}
