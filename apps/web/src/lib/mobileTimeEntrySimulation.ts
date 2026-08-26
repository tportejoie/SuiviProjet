import { PeriodLock, Project, ProjectType, TimeEntry } from "@/types";

export type MobileTimeEntryInput = {
  projectId: string;
  date: string;
  type: "BO" | "SITE";
  hours: number;
};

type SimulationContext = {
  input: MobileTimeEntryInput;
  projects: Project[];
  entries: TimeEntry[];
  lock: PeriodLock | null;
};

export const prepareMobileTimeEntrySimulation = ({
  input,
  projects,
  entries,
  lock
}: SimulationContext) => {
  if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > 8) {
    return {
      ok: false as const,
      errors: ["La durée doit être un nombre entier compris entre 1 et 8 heures."]
    };
  }

  const project = projects.find((candidate) => candidate.id === input.projectId);
  if (!project) {
    return {
      ok: false as const,
      errors: ["Sélectionnez un projet accessible."]
    };
  }

  if (project.type !== ProjectType.AT) {
    return {
      ok: false as const,
      errors: ["Ce projet n’accepte pas d’imputations AT."]
    };
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const year = dateMatch ? Number(dateMatch[1]) : Number.NaN;
  const month = dateMatch ? Number(dateMatch[2]) : Number.NaN;
  const day = dateMatch ? Number(dateMatch[3]) : Number.NaN;
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    Boolean(dateMatch) &&
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  if (!isValidDate) {
    return {
      ok: false as const,
      errors: ["Sélectionnez une date valide."]
    };
  }

  if (lock?.locked) {
    return {
      ok: false as const,
      errors: ["Cette période est verrouillée."]
    };
  }

  const existingEntry = entries.find(
    (entry) =>
      entry.projectId === input.projectId &&
      entry.year === year &&
      entry.month === month - 1 &&
      entry.day === day &&
      entry.type === input.type
  ) ?? null;

  return {
    ok: true as const,
    draft: {
      projectId: input.projectId,
      year,
      month: month - 1,
      day,
      type: input.type,
      hours: input.hours,
      actorName: project.projectManager
    },
    project,
    existingEntry
  };
};
