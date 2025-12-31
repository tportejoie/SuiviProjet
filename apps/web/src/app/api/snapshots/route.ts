import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const where = projectId
    ? { projectId, ...(user.role === "ADMIN" ? {} : { project: { projectManagerEmail: user.email } }) }
    : user.role === "ADMIN"
      ? undefined
      : { project: { projectManagerEmail: user.email } };
  const snapshots = await prisma.projectSituationSnapshot.findMany({
    where,
    orderBy: { computedAt: "desc" }
  });
  return NextResponse.json(snapshots);
}
