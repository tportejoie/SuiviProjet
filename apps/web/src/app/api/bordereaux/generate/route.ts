import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderUrlToPdf } from "../../../../../server/services/pdf";
import { writeFileToStorage } from "../../../../../server/services/storage";
import { generateBordereau } from "../../../../../server/api/bordereaux";
import { requireUser } from "@/server/authz";
import { jsonError, jsonErrorWithDetail } from "@/server/http";

export const runtime = "nodejs";

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

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const printUrl = `${baseUrl}/bordereaux/print?projectId=${encodeURIComponent(payload.projectId)}&year=${periodYear}&month=${periodMonth}`;
    const pdfBuffer = await renderUrlToPdf(printUrl);
    const stored = await writeFileToStorage(pdfBuffer, `${project.projectNumber}-${periodYear}-${periodMonth}.pdf`, "application/pdf");

    const result = await generateBordereau({
      projectId: payload.projectId,
      type: payload.type,
      periodYear,
      periodMonth,
      actorName: payload.actorName || user.name || user.email,
      file: stored
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Bordereau generation failed:", message);
    return jsonErrorWithDetail("Failed to generate bordereau", message, 500);
  }
}

