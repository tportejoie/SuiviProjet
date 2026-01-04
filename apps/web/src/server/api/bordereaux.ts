import { BordereauStatus, BordereauType, SnapshotType, Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { createSnapshot } from "../services/snapshots";
import { writeAuditLog } from "../services/audit";

export const generateBordereau = async (input: {
  projectId: string;
  type: BordereauType;
  periodYear?: number;
  periodMonth?: number;
  actorName: string;
  file: {
    storageKey: string;
    fileName: string;
    contentType: string;
    size: number;
    checksum?: string;
  };
}) => {
  const existing = await prisma.bordereau.findFirst({
    where: {
      projectId: input.projectId,
      type: input.type,
      periodYear: input.periodYear ?? null,
      periodMonth: input.periodMonth ?? null
    },
    include: { versions: true }
  });

  const isRectificatif = Boolean(existing && existing.status === BordereauStatus.SIGNED);
  const signedSnapshot = isRectificatif
    ? await prisma.projectSituationSnapshot.findFirst({
        where: {
          projectId: input.projectId,
          type: SnapshotType.BORDEREAU_SIGNED,
          year: input.periodYear,
          month: input.periodMonth
        },
        orderBy: { computedAt: "desc" }
      })
    : null;

  const snapshotData: Prisma.InputJsonValue = {
    projectId: input.projectId,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    type: input.type,
    file: input.file,
    ...(isRectificatif
      ? {
          reason: "RECTIFICATIF_BORDEREAU",
          signedSnapshotId: signedSnapshot?.id ?? null
        }
      : {})
  };

  const snapshot = await createSnapshot({
    projectId: input.projectId,
    type: isRectificatif ? SnapshotType.RECTIFICATIF : SnapshotType.BORDEREAU_GENERATED,
    year: input.periodYear,
    month: input.periodMonth,
    computedBy: input.actorName,
    supersedesSnapshotId: signedSnapshot?.id,
    data: snapshotData,
  });

  const file = await prisma.fileObject.create({
    data: {
      storageKey: input.file.storageKey,
      fileName: input.file.fileName,
      contentType: input.file.contentType,
      size: input.file.size,
      checksum: input.file.checksum,
    },
  });

  const shouldCreateNew = !existing || existing.status === BordereauStatus.SIGNED;
  const bordereau = shouldCreateNew
    ? await prisma.bordereau.create({
        data: {
          projectId: input.projectId,
          type: existing && existing.status === BordereauStatus.SIGNED ? BordereauType.RECTIFICATIF : input.type,
          status: BordereauStatus.GENERATED,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          snapshotId: snapshot.id,
          createdBy: input.actorName,
        },
      })
    : await prisma.bordereau.update({
        where: { id: existing.id },
        data: {
          status: BordereauStatus.GENERATED,
          snapshotId: snapshot.id,
        },
      });

  const version = await prisma.bordereauVersion.create({
    data: {
      bordereauId: bordereau.id,
      versionNumber: !existing || existing.status === BordereauStatus.SIGNED ? 1 : existing.versions.length + 1,
      fileId: file.id,
      generatedBy: input.actorName,
      snapshotId: snapshot.id,
    },
  });

  await writeAuditLog({
    entityType: "Bordereau",
    entityId: bordereau.id,
    action: "GENERATE",
    diffJson: {
      projectId: input.projectId,
      snapshotId: snapshot.id,
      fileId: file.id,
      versionId: version.id,
    },
    actorName: input.actorName,
  });

  return { bordereau, version, snapshot };
};

export const markBordereauSigned = async (input: {
  bordereauId: string;
  actorName: string;
  sourceRef: string;
}) => {
  const bordereau = await prisma.bordereau.update({
    where: { id: input.bordereauId },
    data: { status: BordereauStatus.SIGNED },
  });

  const snapshot = await createSnapshot({
    projectId: bordereau.projectId,
    type: SnapshotType.BORDEREAU_SIGNED,
    year: bordereau.periodYear ?? undefined,
    month: bordereau.periodMonth ?? undefined,
    computedBy: input.actorName,
    sourceRef: input.sourceRef,
    data: {
      bordereauId: bordereau.id,
      status: "SIGNED",
    },
  });

  await writeAuditLog({
    entityType: "Bordereau",
    entityId: bordereau.id,
    action: "SIGNED",
    diffJson: {
      snapshotId: snapshot.id,
      sourceRef: input.sourceRef,
    },
    actorName: input.actorName,
  });

  return { bordereau, snapshot };
};
