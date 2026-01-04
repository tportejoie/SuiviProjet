import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (!payload.name || !payload.address) {
    return jsonError("Missing fields", 400);
  }

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      name: payload.name,
      address: payload.address,
      siren: payload.siren ?? null,
      siret: payload.siret ?? "",
      tvaIntra: payload.tvaIntra ?? null,
      notes: payload.notes ?? null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  if (force) {
    const { response: adminResponse } = await requireAdmin();
    if (adminResponse) {
      return adminResponse;
    }
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          contacts: true,
          projects: true,
        },
      },
    },
  });

  if (!client) {
    return jsonError("Client not found", 404);
  }

  if (!force && (client._count.contacts > 0 || client._count.projects > 0)) {
    return jsonError("Client has related data", 409);
  }

  if (force) {
    await prisma.$transaction([
      prisma.bordereauVersion.deleteMany({
        where: { bordereau: { project: { clientId: params.id } } },
      }),
      prisma.adobeAgreement.deleteMany({
        where: { bordereau: { project: { clientId: params.id } } },
      }),
      prisma.bordereauComment.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.bordereau.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.projectSituationSnapshot.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.timeEntry.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.deliverable.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.periodLock.deleteMany({
        where: { project: { clientId: params.id } },
      }),
      prisma.project.deleteMany({
        where: { clientId: params.id },
      }),
      prisma.contact.deleteMany({
        where: { clientId: params.id },
      }),
      prisma.client.deleteMany({
        where: { id: params.id },
      }),
    ]);
  } else {
    await prisma.client.delete({
      where: { id: params.id },
    });
  }

  return NextResponse.json({ deleted: true });
}
