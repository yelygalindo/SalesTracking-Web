import { describe, expect, it } from "vitest";
import { trialDaysLeft, trialDaysLeftLabel } from "./trialDays";

const now = new Date("2026-10-12T12:00:00Z");

describe("trialDays", () => {
  it("cuenta un día parcial como día restante", () => {
    expect(trialDaysLeft("2026-10-22T12:00:00Z", now)).toBe(10);
    expect(trialDaysLeft("2026-10-12T18:00:00Z", now)).toBe(1);
    expect(trialDaysLeft("2026-10-12T11:00:00Z", now)).toBe(0);
  });

  it("describe los días restantes", () => {
    expect(trialDaysLeftLabel(10)).toBe("Te quedan 10 días de prueba gratuita.");
    expect(trialDaysLeftLabel(1)).toBe("Te queda 1 día de prueba gratuita.");
    expect(trialDaysLeftLabel(0)).toBe("Tu prueba gratuita terminó.");
  });
});
