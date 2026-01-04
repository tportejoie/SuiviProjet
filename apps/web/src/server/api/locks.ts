import { SnapshotType } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { createSnapshot } from "../services/snapshots";
import { unlockPeriod } from "../services/locks";
import { writeAuditLog } from "../services/audit";

export const adminUnlockPeriod = async (input: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
  reason: string;
}) => {
  const lock = await unlockPeriod({
    projectId: input.projectId,
    year: input.year,
    month: input.month,
    actorName: input.actorName,
    reason: input.reason,
  });

  const signedSnapshot = await prisma.projectSituationSnapshot.findFirst({
    where: {
      projectId: input.projectId,
      type: SnapshotType.BORDEREAU_SIGNED,
      year: input.year,
      month: input.month,
    },
    orderBy: { computedAt: "desc" },
  });

  let rectificatifSnapshotId: string | undefined;
  if (signedSnapshot) {
    const rectificatif = await createSnapshot({
      projectId: input.projectId,
      type: SnapshotType.RECTIFICATIF,
      year: input.year,
      month: input.month,
      computedBy: input.actorName,
      supersedesSnapshotId: signedSnapshot.id,
      data: {
        reason: "UNLOCK_AFTER_SIGNATURE",
        signedSnapshotId: signedSnapshot.id,
      },
    });
    rectificatifSnapshotId = rectificatif.id;
  }

  await writeAuditLog({
    entityType: "PeriodLock",
    entityId: lock.id,
    action: "ADMIN_UNLOCK",
    diffJson: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      rectificatifSnapshotId,
    },
    actorName: input.actorName,
  });

  return { lock, rectificatifSnapshotId };
};
