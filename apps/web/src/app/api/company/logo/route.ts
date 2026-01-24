import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/authz";
import { writeFileToStorage } from "@/server/services/storage";
import path from "path";
import { promises as fs } from "fs";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_COMPANY_ID = "default";

export async function GET(request: Request) {
  const settings = await prisma.companySettings.findUnique({
    where: { id: DEFAULT_COMPANY_ID },
    include: { logoFile: true }
  });

  if (!settings) {
    return jsonError("Logo not found", 404);
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const headers = new Headers();
  const contentType = settings.logoFile?.contentType || settings.logoContentType || "image/png";
  const fileName = settings.logoFile?.fileName || "logo.png";
  headers.set("Content-Type", contentType);
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${fileName}"`
  );

  if (!settings.logoFile && !settings.logoData) {
    return jsonError("Logo not found", 404);
  }

  if (settings.logoFile) {
    const storageRoot = process.env.FILE_STORAGE_PATH || "./storage";
    const filePath = path.join(storageRoot, settings.logoFile.storageKey);
    try {
      const data = await fs.readFile(filePath);
      return new NextResponse(data, { status: 200, headers });
    } catch {
      if (!settings.logoData) {
        return jsonError("Logo not available", 404);
      }
    }
  }

  if (settings.logoData) {
    return new NextResponse(Buffer.from(settings.logoData), { status: 200, headers });
  }

  return jsonError("Logo not available", 404);
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return jsonError("Missing file", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await writeFileToStorage(buffer, file.name || "logo.png", file.type || "image/png");

  const storedFile = await prisma.fileObject.create({
    data: {
      storageKey: stored.storageKey,
      fileName: stored.fileName,
      contentType: stored.contentType,
      size: stored.size,
      checksum: stored.checksum
    }
  });

  await prisma.companySettings.upsert({
    where: { id: DEFAULT_COMPANY_ID },
    create: {
      id: DEFAULT_COMPANY_ID,
      name: "JAMAE",
      logoFileId: storedFile.id,
      logoData: buffer,
      logoContentType: file.type || "image/png"
    },
    update: {
      logoFileId: storedFile.id,
      logoData: buffer,
      logoContentType: file.type || "image/png"
    }
  });

  return NextResponse.json({ ok: true, logoUrl: `/api/company/logo?v=${storedFile.id}` });
}

