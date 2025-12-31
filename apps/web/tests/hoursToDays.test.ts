import { describe, expect, it } from "vitest";
import { hoursToDays } from "../src/utils";

describe("hoursToDays", () => {
  it("converts hours to days using 8h per day", () => {
    expect(hoursToDays(0)).toBe(0);
    expect(hoursToDays(8)).toBe(1);
    expect(hoursToDays(12)).toBe(1.5);
  });
});
