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

const extractEventType = (payload: any) => {
  return (
    payload?.event?.type ||
    payload?.event?.eventType ||
    payload?.eventType ||
    payload?.event_type ||
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

  const agreementId = extractAgreementId(payload);
  if (!agreementId) {
    return respondWithClientId(responseClientId);
  }

  const eventType = extractEventType(payload);
  const status = mapStatus(eventType);

  const agreement = await prisma.adobeAgreement.findFirst({
    where: { providerId: agreementId }
  });

  if (!agreement) {
    return respondWithClientId(responseClientId);
  }

  if (status && agreement.status !== status) {
    await prisma.adobeAgreement.update({
      where: { id: agreement.id },
      data: { status }
    });
  }

  if (status === "SIGNED") {
    await markBordereauSigned({
      bordereauId: agreement.bordereauId,
      actorName: "Adobe Sign",
      sourceRef: agreementId
    });
  }

  return respondWithClientId(responseClientId);
}

export async function GET(request: Request) {
  const expectedClientId = process.env.ADOBE_SIGN_CLIENT_ID;
  const providedClientId = getClientId(request);
  const responseClientId = providedClientId || expectedClientId || null;
  return respondWithClientId(responseClientId);
}
