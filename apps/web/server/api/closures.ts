import { SnapshotType } from "@prisma/client";
import { lockPeriod } from "../services/locks";
import { buildAtMonthSnapshot, createSnapshot } from "../services/snapshots";
import { writeAuditLog } from "../services/audit";

export const closeMonth = async (input: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
}) => {
  const payload = await buildAtMonthSnapshot({
    projectId: input.projectId,
    year: input.year,
    month: input.month,
  });

  const snapshot = await createSnapshot({
    projectId: input.projectId,
    type: SnapshotType.MONTH_END,
    year: input.year,
    month: input.month,
    computedBy: input.actorName,
    data: payload,
  });

  await lockPeriod({
    projectId: input.projectId,
    year: input.year,
    month: input.month,
    actorName: input.actorName,
    reason: "MONTH_CLOSE",
  });

  await writeAuditLog({
    entityType: "ProjectSituationSnapshot",
    entityId: snapshot.id,
    action: "MONTH_CLOSE",
    diffJson: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      snapshotId: snapshot.id,
    },
    actorName: input.actorName,
  });

  return snapshot;
};
