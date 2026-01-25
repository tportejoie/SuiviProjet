import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderUrlToPdf } from "@/server/services/pdf";
import { readFileFromStorage, writeFileToStorage } from "@/server/services/storage";
import { generateBordereau } from "@/server/api/bordereaux";
import { requireUser } from "@/server/authz";
import { jsonError, jsonErrorWithDetail } from "@/server/http";
import { buildAgreementMessage, createAgreement, createTransientDocument } from "@/server/services/adobeSign";
import { getMonthName } from "@/utils";
import { ProjectType } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) {
      return response;
    }
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const payload = await request.json();
    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
      include: { client: true, contact: true, deliverables: true }
    });

    if (!project) {
      return jsonError("Project not found", 404);
    }
    if (user.role !== "ADMIN" && project.projectManagerEmail !== user.email) {
      return jsonError("Forbidden", 403);
    }

    const periodYear = payload.periodYear ?? new Date().getFullYear();
    const periodMonth = payload.periodMonth ?? new Date().getMonth();

    const requestOrigin = new URL(request.url).origin;
    const baseUrl = process.env.APP_BASE_URL || requestOrigin;
    const printPath = `/bordereaux/print?projectId=${encodeURIComponent(payload.projectId)}&year=${periodYear}&month=${periodMonth}`;
    const primaryUrl = `${baseUrl}${printPath}`;
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderUrlToPdf(primaryUrl);
    } catch (error) {
      const fallbackBaseUrl = "http://localhost:3000";
      if (baseUrl === fallbackBaseUrl) {
        throw error;
      }
      const fallbackUrl = `${fallbackBaseUrl}${printPath}`;
      pdfBuffer = await renderUrlToPdf(fallbackUrl);
    }
    const stored = await writeFileToStorage(pdfBuffer, `${project.projectNumber}-${periodYear}-${periodMonth}.pdf`, "application/pdf");

    const result = await generateBordereau({
      projectId: payload.projectId,
      type: payload.type,
      periodYear,
      periodMonth,
      actorName: payload.actorName || user.name || user.email,
      file: stored
    });

    const wantsSignature = payload.sendForSignature === true;
    if (wantsSignature && process.env.ADOBE_SIGN_ENABLED !== "true") {
      return jsonErrorWithDetail("Adobe Sign disabled", "ADOBE_SIGN_ENABLED is false", 400);
    }

    if (wantsSignature && process.env.ADOBE_SIGN_ENABLED === "true") {
      const apiKey = process.env.ADOBE_SIGN_API_KEY;
      if (!apiKey) {
        return jsonErrorWithDetail("Adobe Sign misconfigured", "Missing ADOBE_SIGN_API_KEY", 500);
      }
      if (!project.contact?.email) {
        return jsonErrorWithDetail("Adobe Sign misconfigured", "Missing signataire email", 500);
      }
      const pdfFile = await readFileFromStorage(stored.storageKey);
      const transient = await createTransientDocument(apiKey, stored.fileName, pdfFile);
      const periodLabel = `${getMonthName(periodMonth)} ${periodYear}`;
      const message = buildAgreementMessage({
        type: project.type as ProjectType,
        projectNumber: project.projectNumber,
        designation: project.designation,
        periodLabel
      });
      const agreement = await createAgreement(apiKey, {
        name: message.subject,
        message: message.message,
        fileInfos: [{ transientDocumentId: transient.transientDocumentId }],
        participantSetsInfo: [
          {
            memberInfos: [{ email: project.contact.email }],
            order: 1,
            role: "SIGNER"
          }
        ],
        signatureType: "ESIGN",
        state: "IN_PROCESS"
      });

      await prisma.adobeAgreement.upsert({
        where: { bordereauId: result.bordereau.id },
        create: {
          bordereauId: result.bordereau.id,
          providerId: agreement.id,
          status: agreement.status || "SENT"
        },
        update: {
          providerId: agreement.id,
          status: agreement.status || "SENT"
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Bordereau generation failed:", message);
    return jsonErrorWithDetail("Failed to generate bordereau", message, 500);
  }
}


