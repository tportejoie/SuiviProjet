import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markBordereauSigned } from "@/server/api/bordereaux";
import { writeFileToStorage } from "@/server/services/storage";
import { downloadAgreementAuditTrail, downloadAgreementPdf } from "@/server/services/adobeSign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const extractAgreementId = (payload: any) => {
  return (
    payload?.agreementId ||
    payload?.agreement?.id ||
    payload?.agreement?.agreementId ||
    payload?.agreement_id ||
    payload?.agreementId?.id ||
    null
  );
};

const extractEventType = (event: any) => {
  return (
    event?.type ||
    event?.eventType ||
    event?.event_type ||
    event?.eventName ||
    event?.event?.type ||
    event?.event?.eventType ||
    event?.agreementEvent?.type ||
    event?.agreementEvent?.eventType ||
    null
  );
};

const extractAgreementStatus = (payload: any, event: any) => {
  return (
    event?.agreementStatus ||
    event?.agreement?.status ||
    payload?.agreementStatus ||
    payload?.agreement?.status ||
    payload?.agreement?.agreementStatus ||
    null
  );
};

const mapStatus = (eventType: string | null) => {
  if (!eventType) return null;
  switch (eventType) {
    case "AGREEMENT_CREATED":
      return "SENT";
    case "AGREEMENT_ACTION_COMPLETED":
    case "AGREEMENT_SIGNED":
    case "AGREEMENT_COMPLETED":
    case "AGREEMENT_WORKFLOW_COMPLETED":
      return "SIGNED";
    case "AGREEMENT_CANCELLED":
      return "CANCELLED";
    case "AGREEMENT_DECLINED":
      return "DECLINED";
    case "AGREEMENT_EXPIRED":
      return "EXPIRED";
    default:
      return null;
  }
};

const mapAgreementStatus = (status: string | null) => {
  if (!status) return null;
  switch (status.toUpperCase()) {
    case "SIGNED":
    case "APPROVED":
    case "COMPLETED":
      return "SIGNED";
    case "CANCELLED":
      return "CANCELLED";
    case "DECLINED":
      return "DECLINED";
    case "EXPIRED":
      return "EXPIRED";
    case "OUT_FOR_SIGNATURE":
    case "OUT_FOR_APPROVAL":
      return "SENT";
    default:
      return null;
  }
};

const extractEvents = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.eventList)) return payload.eventList;
  if (Array.isArray(payload?.event_list)) return payload.event_list;
  if (payload?.event) return [payload.event];
  return [];
};

const getClientId = (request: Request) => {
  const url = new URL(request.url);
  const headerId = request.headers.get("x-adobesign-clientid");
  const queryId = url.searchParams.get("client_id") || url.searchParams.get("clientId");
  return headerId || queryId || null;
};

const respondWithClientId = (clientId: string | null) => {
  const headers = new Headers();
  if (clientId) {
    headers.set("X-AdobeSign-ClientId", clientId);
  }
  const body = clientId ? { xAdobeSignClientId: clientId } : { ok: true };
  return NextResponse.json(body, { headers });
};

export async function POST(request: Request) {
  const expectedClientId = process.env.ADOBE_SIGN_CLIENT_ID;
  const providedClientId = getClientId(request);
  const responseClientId = providedClientId || expectedClientId || null;

  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    console.warn("Adobe Sign webhook: invalid JSON payload");
    return respondWithClientId(responseClientId);
  }

  console.info("Adobe Sign webhook received", {
    hasEvents: Array.isArray(payload?.events) || Array.isArray(payload?.eventList) || Array.isArray(payload?.event_list),
    hasEvent: Boolean(payload?.event),
    agreementId: extractAgreementId(payload)
  });

  const events = extractEvents(payload);
  const baseAgreementId = extractAgreementId(payload);
  if (!events.length && !baseAgreementId) {
    console.info("Adobe Sign webhook: no agreementId found");
    return respondWithClientId(responseClientId);
  }

  const normalizedEvents =
    events.length > 0
      ? events.map((event: any) => ({
          eventType: extractEventType(event),
          agreementId: extractAgreementId(event) || baseAgreementId,
          agreementStatus: extractAgreementStatus(payload, event),
          rawEvent: event
        }))
      : [
          {
            eventType: extractEventType(payload),
            agreementId: baseAgreementId,
            agreementStatus: extractAgreementStatus(payload, payload),
            rawEvent: payload?.event || payload
          }
        ];

  for (const event of normalizedEvents) {
    if (!event.agreementId) continue;
    const status = mapStatus(event.eventType) ?? mapAgreementStatus(event.agreementStatus);
    if (!status) continue;

    console.info("Adobe Sign webhook event", {
      agreementId: event.agreementId,
      eventType: event.eventType,
      status,
      agreementStatus: event.agreementStatus
    });

    const agreement = await prisma.adobeAgreement.findFirst({
      where: { providerId: event.agreementId }
    });

    if (!agreement) continue;

    const alreadySigned = agreement.status === "SIGNED";
    if (agreement.status !== status) {
      await prisma.adobeAgreement.update({
        where: { id: agreement.id },
        data: { status }
      });
    }

    if (status === "SIGNED") {
      if (alreadySigned) continue;
      let signedFile: { storageKey: string; fileName: string; contentType: string; size: number; checksum?: string } | undefined;
      let auditFileId: string | undefined;
      const apiKey = process.env.ADOBE_SIGN_API_KEY;
      if (apiKey) {
        try {
          const pdfBuffer = await downloadAgreementPdf(apiKey, event.agreementId);
          signedFile = await writeFileToStorage(
            pdfBuffer,
            `bordereau-signed-${event.agreementId}.pdf`,
            "application/pdf"
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("Adobe Sign download signed PDF failed:", message);
        }
        try {
          if (!agreement.auditFileId) {
            const auditBuffer = await downloadAgreementAuditTrail(apiKey, event.agreementId);
            const storedAudit = await writeFileToStorage(
              auditBuffer,
              `audit-trail-${event.agreementId}.pdf`,
              "application/pdf"
            );
            const auditFile = await prisma.fileObject.create({
              data: {
                storageKey: storedAudit.storageKey,
                fileName: storedAudit.fileName,
                contentType: storedAudit.contentType,
                size: storedAudit.size,
                checksum: storedAudit.checksum
              }
            });
            auditFileId = auditFile.id;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("Adobe Sign download audit trail failed:", message);
        }
      }

      await markBordereauSigned({
        bordereauId: agreement.bordereauId,
        actorName: "Adobe Sign",
        sourceRef: event.agreementId,
        signedFile
      });

      if (auditFileId) {
        await prisma.adobeAgreement.update({
          where: { id: agreement.id },
          data: { auditFileId }
        });
      }
    }
  }

  return respondWithClientId(responseClientId);
}

export async function GET(request: Request) {
  const expectedClientId = process.env.ADOBE_SIGN_CLIENT_ID;
  const providedClientId = getClientId(request);
  const responseClientId = providedClientId || expectedClientId || null;
  return respondWithClientId(responseClientId);
}

