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

export async function POST(request: Request) {
  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const agreementId = extractAgreementId(payload);
  if (!agreementId) {
    return NextResponse.json({ ok: true });
  }

  const eventType = extractEventType(payload);
  const status = mapStatus(eventType);

  const agreement = await prisma.adobeAgreement.findFirst({
    where: { providerId: agreementId }
  });

  if (!agreement) {
    return NextResponse.json({ ok: true });
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

  return NextResponse.json({ ok: true });
}
