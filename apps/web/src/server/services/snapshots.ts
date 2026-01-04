import { Prisma, SnapshotType, TimeEntryType } from "@prisma/client";
import { prisma } from "@/server/prisma";

const HOURS_PER_DAY = 8;

const hoursToDays = (hours: number) => hours / HOURS_PER_DAY;

const sumHours = (entries: { type: TimeEntryType; hours: number }[], type: TimeEntryType) =>
  entries.filter((entry) => entry.type === type).reduce((acc, curr) => acc + curr.hours, 0);

export const computeAtSnapshot = (input: {
  project: {
    id: string;
    atDaysSoldBO?: number | null;
    atDaysSoldSite?: number | null;
    atDailyRateBO?: number | null;
    atDailyRateSite?: number | null;
  };
  year: number;
  month: number;
  monthEntries: { id: string; type: TimeEntryType; hours: number }[];
  cumulativeEntries: { id: string; type: TimeEntryType; hours: number }[];
}) => {
  const monthHoursBO = sumHours(input.monthEntries, TimeEntryType.BO);
  const monthHoursSite = sumHours(input.monthEntries, TimeEntryType.SITE);
  const cumulHoursBO = sumHours(input.cumulativeEntries, TimeEntryType.BO);
  const cumulHoursSite = sumHours(input.cumulativeEntries, TimeEntryType.SITE);

  const monthDaysBO = hoursToDays(monthHoursBO);
  const monthDaysSite = hoursToDays(monthHoursSite);
  const cumulDaysBO = hoursToDays(cumulHoursBO);
  const cumulDaysSite = hoursToDays(cumulHoursSite);

  const soldBO = input.project.atDaysSoldBO ?? 0;
  const soldSite = input.project.atDaysSoldSite ?? 0;
  const rateBO = input.project.atDailyRateBO ?? 0;
  const rateSite = input.project.atDailyRateSite ?? 0;

  const monthAmount = monthDaysBO * rateBO + monthDaysSite * rateSite;
  const cumulAmount = cumulDaysBO * rateBO + cumulDaysSite * rateSite;
  const remainingDaysBO = Math.max(0, soldBO - cumulDaysBO);
  const remainingDaysSite = Math.max(0, soldSite - cumulDaysSite);
  const remainingAmount = remainingDaysBO * rateBO + remainingDaysSite * rateSite;

  return {
    projectId: input.project.id,
    year: input.year,
    month: input.month,
    sold: {
      boDays: soldBO,
      siteDays: soldSite,
      boRate: rateBO,
      siteRate: rateSite,
    },
    monthData: {
      boHours: monthHoursBO,
      siteHours: monthHoursSite,
      boDays: monthDaysBO,
      siteDays: monthDaysSite,
      amount: monthAmount,
    },
    cumulative: {
      boHours: cumulHoursBO,
      siteHours: cumulHoursSite,
      boDays: cumulDaysBO,
      siteDays: cumulDaysSite,
      amount: cumulAmount,
    },
    remaining: {
      boDays: remainingDaysBO,
      siteDays: remainingDaysSite,
      amount: remainingAmount,
    },
    alerts: {
      exceededSold: cumulDaysBO > soldBO || cumulDaysSite > soldSite,
    },
    source: {
      projectId: input.project.id,
      year: input.year,
      month: input.month,
      timeEntryIds: input.monthEntries.map((entry) => entry.id),
    },
  };
};

export const buildAtMonthSnapshot = async (input: {
  projectId: string;
  year: number;
  month: number;
}) => {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  const monthEntries = await prisma.timeEntry.findMany({
    where: {
      projectId: input.projectId,
      year: input.year,
      month: input.month,
    },
  });

  const cumulativeEntries = await prisma.timeEntry.findMany({
    where: {
      projectId: input.projectId,
      OR: [
        { year: input.year, month: { lte: input.month } },
        { year: { lt: input.year } },
      ],
    },
  });

  return computeAtSnapshot({
    project,
    year: input.year,
    month: input.month,
    monthEntries,
    cumulativeEntries,
  });
};

export const createSnapshot = async (input: {
  projectId: string;
  type: SnapshotType;
  year?: number;
  month?: number;
  computedBy: string;
  sourceRef?: string;
  data: Prisma.InputJsonValue;
  supersedesSnapshotId?: string;
}) => {
  return prisma.projectSituationSnapshot.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      year: input.year,
      month: input.month,
      computedBy: input.computedBy,
      sourceRef: input.sourceRef,
      dataJson: input.data,
      supersedesSnapshotId: input.supersedesSnapshotId,
    },
  });
};
