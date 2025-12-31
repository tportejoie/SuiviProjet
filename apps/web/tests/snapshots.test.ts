import { describe, expect, it } from "vitest";
import { TimeEntryType } from "@prisma/client";
import { computeAtSnapshot } from "../server/services/snapshots";

describe("computeAtSnapshot", () => {
  it("computes month and cumulative totals", () => {
    const result = computeAtSnapshot({
      project: {
        id: "p1",
        atDaysSoldBO: 10,
        atDaysSoldSite: 5,
        atDailyRateBO: 800,
        atDailyRateSite: 900
      },
      year: 2024,
      month: 1,
      monthEntries: [
        { id: "t1", type: TimeEntryType.BO, hours: 8 },
        { id: "t2", type: TimeEntryType.SITE, hours: 4 }
      ],
      cumulativeEntries: [
        { id: "t0", type: TimeEntryType.BO, hours: 8 },
        { id: "t1", type: TimeEntryType.BO, hours: 8 },
        { id: "t2", type: TimeEntryType.SITE, hours: 4 }
      ]
    });

    expect(result.month.boDays).toBe(1);
    expect(result.month.siteDays).toBe(0.5);
    expect(result.cumulative.boDays).toBe(2);
    expect(result.remaining.boDays).toBe(8);
    expect(result.alerts.exceededSold).toBe(false);
  });
});
