import { describe, expect, it } from "vitest";
import { prepareMobileTimeEntrySimulation } from "@/lib/mobileTimeEntrySimulation";
import { ProjectStatus, ProjectType } from "@/types";

const project = {
  id: "project-1",
  projectNumber: "P-001",
  orderNumber: "CMD-1",
  orderDate: "2026-01-01",
  quoteNumber: "DEV-1",
  quoteDate: "2026-01-01",
  clientId: "client-1",
  contactId: "contact-1",
  designation: "Projet test",
  projectManager: "Thomas",
  type: ProjectType.AT,
  status: ProjectStatus.EN_COURS
};

describe("prepareMobileTimeEntrySimulation", () => {
  it("prépare une imputation simulée avec un mois indexé à zéro", () => {
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: project.id,
        date: "2026-08-25",
        type: "BO",
        hours: 8
      },
      projects: [project],
      entries: [],
      lock: null
    });

    expect(result).toEqual({
      ok: true,
      draft: {
        projectId: project.id,
        year: 2026,
        month: 7,
        day: 25,
        type: "BO",
        hours: 8,
        actorName: "Thomas"
      },
      project,
      existingEntry: null
    });
  });

  it("refuse une simulation lorsque la période est verrouillée", () => {
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: project.id,
        date: "2026-08-25",
        type: "SITE",
        hours: 4
      },
      projects: [project],
      entries: [],
      lock: {
        projectId: project.id,
        year: 2026,
        month: 7,
        locked: true
      }
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Cette période est verrouillée."]
    });
  });

  it.each([0, -1, 1.5, 9])("refuse la durée non autorisée %s", (hours) => {
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: project.id,
        date: "2026-08-25",
        type: "BO",
        hours
      },
      projects: [project],
      entries: [],
      lock: null
    });

    expect(result).toEqual({
      ok: false,
      errors: ["La durée doit être un nombre entier compris entre 1 et 8 heures."]
    });
  });

  it("refuse un projet absent ou non accessible", () => {
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: "unknown",
        date: "2026-08-25",
        type: "BO",
        hours: 4
      },
      projects: [project],
      entries: [],
      lock: null
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Sélectionnez un projet accessible."]
    });
  });

  it("refuse un projet qui n’est pas en assistance technique", () => {
    const forfaitProject = { ...project, type: ProjectType.FORFAIT };
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: forfaitProject.id,
        date: "2026-08-25",
        type: "BO",
        hours: 4
      },
      projects: [forfaitProject],
      entries: [],
      lock: null
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Ce projet n’accepte pas d’imputations AT."]
    });
  });

  it.each(["", "25/08/2026", "2026-02-30"])("refuse la date invalide %s", (date) => {
    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: project.id,
        date,
        type: "BO",
        hours: 4
      },
      projects: [project],
      entries: [],
      lock: null
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Sélectionnez une date valide."]
    });
  });

  it("signale l’imputation qui serait remplacée", () => {
    const existingEntry = {
      id: "entry-1",
      projectId: project.id,
      year: 2026,
      month: 7,
      day: 25,
      type: "BO" as const,
      hours: 2,
      comment: ""
    };

    const result = prepareMobileTimeEntrySimulation({
      input: {
        projectId: project.id,
        date: "2026-08-25",
        type: "BO",
        hours: 4
      },
      projects: [project],
      entries: [existingEntry],
      lock: null
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.existingEntry).toEqual(existingEntry);
    }
  });
});
