import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileTimeEntrySimulator from "@/components/MobileTimeEntrySimulator";
import { UserRole } from "@/types";

describe("MobileTimeEntrySimulator", () => {
  it("annonce le mode simulation sans proposer d’enregistrement", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileTimeEntrySimulator, {
        currentUser: {
          id: "user-1",
          email: "user@example.com",
          name: "Thomas",
          role: UserRole.ADMIN,
          active: true
        }
      })
    );

    expect(html).toContain("Simulation uniquement");
    expect(html).toContain("Aucune donnée ne sera enregistrée");
    expect(html).not.toContain("Enregistrer l’imputation");
  });
});
