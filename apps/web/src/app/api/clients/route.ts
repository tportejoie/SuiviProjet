import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const clients = await prisma.client.findMany({
    where: user.role === "ADMIN"
      ? undefined
      : {
          projects: {
            some: { projectManagerEmail: user.email }
          }
        },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (payload.siret && !/^\d{14}$/.test(payload.siret)) {
    return jsonError("Invalid SIRET", 400);
  }
  const client = await prisma.client.create({
    data: {
      name: payload.name,
      address: payload.address,
      siren: payload.siren,
      siret: payload.siret || "",
      tvaIntra: payload.tvaIntra,
      notes: payload.notes
    }
  });
  return NextResponse.json(client, { status: 201 });
}


