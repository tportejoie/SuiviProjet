import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response || !user) {
    return response;
  }

  if (user.role !== "ADMIN") {
    const client = await prisma.client.findUnique({
      where: { id: context.params.id },
      select: {
        projects: { select: { projectManagerEmail: true } }
      }
    });
    const isAllowed = client?.projects.some(project => project.projectManagerEmail === user.email);
    if (!isAllowed) {
      return jsonError("Forbidden", 403);
    }
  }

  const payload = await request.json();
  if (payload.siret && !/^\d{14}$/.test(payload.siret)) {
    return jsonError("Invalid SIRET", 400);
  }

  const client = await prisma.client.update({
    where: { id: context.params.id },
    data: {
      name: payload.name,
      address: payload.address,
      siren: payload.siren,
      siret: payload.siret,
      tvaIntra: payload.tvaIntra,
      notes: payload.notes
    }
  });

  return NextResponse.json(client);
}
