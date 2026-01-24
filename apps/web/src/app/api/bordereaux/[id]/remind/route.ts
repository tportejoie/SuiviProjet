import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError, jsonErrorWithDetail } from "@/server/http";
import { getAgreementMemberIds, sendAgreementReminder } from "@/server/services/adobeSign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  if (process.env.ADOBE_SIGN_ENABLED !== "true") {
    return jsonErrorWithDetail("Adobe Sign disabled", "ADOBE_SIGN_ENABLED is false", 400);
  }
  const apiKey = process.env.ADOBE_SIGN_API_KEY;
  if (!apiKey) {
    return jsonErrorWithDetail("Adobe Sign misconfigured", "Missing ADOBE_SIGN_API_KEY", 500);
  }

  const bordereau = await prisma.bordereau.findUnique({
    where: { id: context.params.id },
    include: { project: true, agreement: true }
  });

  if (!bordereau) {
    return jsonError("Bordereau not found", 404);
  }

  const accessResponse = await ensureProjectAccess(bordereau.projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const agreement = bordereau.agreement;
  if (!agreement?.providerId) {
    return jsonErrorWithDetail("Adobe Sign not configured", "No agreement found", 400);
  }

  try {
    const participantIds = await getAgreementMemberIds(apiKey, agreement.providerId);
    if (participantIds.length === 0) {
      return jsonErrorWithDetail("Adobe Sign reminder failed", "No participant IDs found", 400);
    }
    const result = await sendAgreementReminder(apiKey, agreement.providerId, participantIds);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonErrorWithDetail("Adobe Sign reminder failed", message, 500);
  }
}
