import { prisma } from "../prisma";
import { writeAuditLog } from "./audit";

export const assertNotLocked = async (
  projectId: string,
  year: number,
  month: number
) => {
  const lock = await prisma.periodLock.findUnique({
    where: {
      projectId_year_month: {
        projectId,
        year,
        month,
      },
    },
  });

  if (lock?.locked) {
    const error = new Error("Period is locked");
    (error as Error & { code?: string }).code = "PERIOD_LOCKED";
    throw error;
  }
};

export const lockPeriod = async (input: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
  reason?: string;
}) => {
  return prisma.periodLock.upsert({
    where: {
      projectId_year_month: {
        projectId: input.projectId,
        year: input.year,
        month: input.month,
      },
    },
    update: {
      locked: true,
      lockedAt: new Date(),
      lockedBy: input.actorName,
      reason: input.reason,
    },
    create: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      locked: true,
      lockedAt: new Date(),
      lockedBy: input.actorName,
      reason: input.reason,
    },
  });
};

export const unlockPeriod = async (input: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
  reason: string;
}) => {
  const lock = await prisma.periodLock.upsert({
    where: {
      projectId_year_month: {
        projectId: input.projectId,
        year: input.year,
        month: input.month,
      },
    },
    update: {
      locked: false,
      lockedBy: input.actorName,
      lockedAt: new Date(),
      reason: input.reason,
    },
    create: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      locked: false,
      lockedBy: input.actorName,
      lockedAt: new Date(),
      reason: input.reason,
    },
  });

  await writeAuditLog({
    entityType: "PeriodLock",
    entityId: lock.id,
    action: "UNLOCK",
    diffJson: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      reason: input.reason,
    },
    actorName: input.actorName,
  });

  return lock;
};
