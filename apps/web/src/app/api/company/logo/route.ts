import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/authz";
import { writeFileToStorage } from "../../../../../server/services/storage";
import path from "path";
import { promises as fs } from "fs";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

const DEFAULT_COMPANY_ID = "default";

export async function GET(request: Request) {
  const settings = await prisma.companySettings.findUnique({
    where: { id: DEFAULT_COMPANY_ID },
    include: { logoFile: true }
  });

  if (!settings?.logoFile) {
    return jsonError("Logo not found", 404);
  }

  const storageRoot = process.env.FILE_STORAGE_PATH || "./storage";
  const filePath = path.join(storageRoot, settings.logoFile.storageKey);

  try {
    const data = await fs.readFile(filePath);
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const headers = new Headers();
    headers.set("Content-Type", settings.logoFile.contentType || "image/png");
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${settings.logoFile.fileName}"`
    );
    return new NextResponse(data, { status: 200, headers });
  } catch {
    return jsonError("Logo not available", 404);
  }
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
      logoFileId: storedFile.id
    },
    update: { logoFileId: storedFile.id }
  });

  return NextResponse.json({ ok: true, logoUrl: "/api/company/logo" });
}
