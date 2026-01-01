import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { promises as fs } from "fs";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const file = await prisma.fileObject.findUnique({
    where: { id: context.params.id },
    include: {
      versions: {
        include: {
          bordereau: {
            include: { project: true }
          }
        }
      }
    }
  });

  if (!file) {
    return jsonError("File not found", 404);
  }

  if (user.role !== "ADMIN") {
    const isAllowed = file.versions.some(version => version.bordereau.project.projectManagerEmail === user.email);
    if (!isAllowed) {
      return jsonError("Forbidden", 403);
    }
  }

  const storageRoot = process.env.FILE_STORAGE_PATH || "./storage";
  const filePath = path.join(storageRoot, file.storageKey);

  try {
    const data = await fs.readFile(filePath);
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const headers = new Headers();
    headers.set("Content-Type", file.contentType || "application/pdf");
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${file.fileName}"`
    );
    return new NextResponse(data, { status: 200, headers });
  } catch {
    return jsonError("File not available", 404);
  }
}


