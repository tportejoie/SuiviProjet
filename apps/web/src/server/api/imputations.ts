import { TimeEntryType } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { assertNotLocked } from "../services/locks";
import { writeAuditLog } from "../services/audit";

export const upsertTimeEntry = async (input: {
  projectId: string;
  year: number;
  month: number;
  day: number;
  type: TimeEntryType;
  hours: number;
  hourSlot?: number;
  comment?: string;
  actorName: string;
}) => {
  await assertNotLocked(input.projectId, input.year, input.month);

  const hourSlot = input.hourSlot ?? 0;

  if (input.hours <= 0) {
    await prisma.timeEntry.deleteMany({
      where: {
        projectId: input.projectId,
        year: input.year,
        month: input.month,
        day: input.day,
        type: input.type,
        hourSlot,
      },
    });

    await writeAuditLog({
      entityType: "TimeEntry",
      entityId: `${input.projectId}:${input.year}:${input.month}:${input.day}:${input.type}:${hourSlot}`,
      action: "DELETE",
      diffJson: {
        projectId: input.projectId,
        year: input.year,
        month: input.month,
        day: input.day,
        type: input.type,
        hourSlot,
      },
      actorName: input.actorName,
    });

    return null;
  }

  const entry = await prisma.timeEntry.upsert({
    where: {
      projectId_year_month_day_type_hourSlot: {
        projectId: input.projectId,
        year: input.year,
        month: input.month,
        day: input.day,
        type: input.type,
        hourSlot,
      },
    },
    update: {
      hours: input.hours,
      comment: input.comment,
    },
    create: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      day: input.day,
      type: input.type,
      hours: input.hours,
      hourSlot,
      comment: input.comment,
    },
  });

  await writeAuditLog({
    entityType: "TimeEntry",
    entityId: entry.id,
    action: "UPSERT",
    diffJson: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      day: input.day,
      type: input.type,
      hours: input.hours,
      hourSlot,
    },
    actorName: input.actorName,
  });

  return entry;
};

export const listMonthEntries = async (input: {
  projectId: string;
  year: number;
  month: number;
}) => {
  return prisma.timeEntry.findMany({
    where: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      hours: {
        gt: 0,
      },
    },
    orderBy: [{ day: "asc" }, { type: "asc" }, { hourSlot: "asc" }],
  });
};
