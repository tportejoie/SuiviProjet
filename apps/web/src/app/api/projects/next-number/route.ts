import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";

export const runtime = "nodejs";

const padProjectNumber = (value: number) => value.toString().padStart(3, "0");

export async function GET(request: Request) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const prefix = `PRJ-${year}-`;
  const projects = await prisma.project.findMany({
    where: { projectNumber: { startsWith: prefix } },
    select: { projectNumber: true }
  });
  const max = projects.reduce((acc, project) => {
    const match = project.projectNumber.replace(prefix, "");
    const parsed = Number(match);
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return NextResponse.json({ next: `${prefix}${padProjectNumber(max + 1)}` });
}
