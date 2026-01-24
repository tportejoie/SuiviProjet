import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const fileId = context.params.id;
  const file = await prisma.fileObject.findUnique({
    where: { id: fileId },
    include: { versions: { include: { bordereau: true } } }
  });

  if (!file) {
    return jsonError("File not found", 404);
  }

  const projectId = file.versions[0]?.bordereau?.projectId;
  if (!projectId) {
    return jsonError("File not linked to a project", 404);
  }

  const accessResponse = await ensureProjectAccess(projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const storagePath = process.env.FILE_STORAGE_PATH || "./storage";
  const filePath = path.join(storagePath, file.storageKey);

  try {
    const buffer = await fs.readFile(filePath);
    const url = new URL(request.url);
    const download = url.searchParams.get("download");
    const headers = new Headers({
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(buffer.length)
    });
    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${file.fileName}"`
      );
    }
    return new NextResponse(buffer, { headers });
  } catch {
    return jsonError("File not found on storage", 404);
  }
}
