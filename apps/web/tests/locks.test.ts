import { describe, expect, it, vi } from "vitest";

vi.mock("../server/prisma", () => ({
  prisma: {
    periodLock: {
      findUnique: vi.fn().mockResolvedValue({ locked: true })
    }
  }
}));

import { assertNotLocked } from "../server/services/locks";

describe("assertNotLocked", () => {
  it("throws when a period is locked", async () => {
    await expect(assertNotLocked("p1", 2024, 2)).rejects.toMatchObject({ code: "PERIOD_LOCKED" });
  });
});
