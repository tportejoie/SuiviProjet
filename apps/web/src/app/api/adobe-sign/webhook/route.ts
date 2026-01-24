import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markBordereauSigned } from "@/server/api/bordereaux";

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
    return respondWithClientId(responseClientId);
  }

  const events = extractEvents(payload);
  const baseAgreementId = extractAgreementId(payload);
  if (!events.length && !baseAgreementId) {
    return respondWithClientId(responseClientId);
  }

  const normalizedEvents =
    events.length > 0
      ? events.map((event: any) => ({
          eventType: extractEventType(event),
          agreementId: extractAgreementId(event) || baseAgreementId
        }))
      : [{ eventType: extractEventType(payload), agreementId: baseAgreementId }];

  for (const event of normalizedEvents) {
    if (!event.agreementId) continue;
    const status = mapStatus(event.eventType);
    if (!status) continue;

    const agreement = await prisma.adobeAgreement.findFirst({
      where: { providerId: event.agreementId }
    });

    if (!agreement) continue;

    if (agreement.status !== status) {
      await prisma.adobeAgreement.update({
        where: { id: agreement.id },
        data: { status }
      });
    }

    if (status === "SIGNED") {
      await markBordereauSigned({
        bordereauId: agreement.bordereauId,
        actorName: "Adobe Sign",
        sourceRef: event.agreementId
      });
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
