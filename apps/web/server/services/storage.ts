import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface StoredFile {
  storageKey: string;
  fileName: string;
  contentType: string;
  size: number;
  checksum: string;
}

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const writeFileToStorage = async (buffer: Buffer, fileName: string, contentType: string) => {
  const basePath = process.env.FILE_STORAGE_PATH || "./storage";
  await ensureDir(basePath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storageKey = `${timestamp}-${fileName}`;
  const fullPath = path.join(basePath, storageKey);

  await fs.writeFile(fullPath, buffer);
  const checksum = createHash("sha256").update(buffer).digest("hex");

  return {
    storageKey,
    fileName,
    contentType,
    size: buffer.length,
    checksum
  } satisfies StoredFile;
};
