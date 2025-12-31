import { NextResponse } from "next/server";
import { markBordereauSigned } from "../../../../../../server/api/bordereaux";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response || !user) {
    return response;
  }

  const bordereau = await prisma.bordereau.findUnique({
    where: { id: context.params.id },
    select: { project: { select: { projectManagerEmail: true } } },
  });
  if (!bordereau) {
    return jsonError("Not found", 404);
  }
  if (user.role !== "ADMIN" && bordereau.project.projectManagerEmail !== user.email) {
    return jsonError("Forbidden", 403);
  }

  const payload = await request.json();
  const result = await markBordereauSigned({
    bordereauId: context.params.id,
    actorName: payload.actorName || user.name || user.email,
    sourceRef: payload.sourceRef
  });
  return NextResponse.json(result);
}
