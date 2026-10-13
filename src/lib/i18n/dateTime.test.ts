import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./dateTime";

const now = new Date("2026-10-13T18:00:00Z");

describe("formatRelativeTime", () => {
  it("muestra minutos y horas recientes de forma relativa", () => {
    expect(formatRelativeTime("2026-10-13T17:59:40Z", now)).toBe("ahora");
    expect(formatRelativeTime("2026-10-13T17:55:00Z", now)).toBe("hace 5 minutos");
    expect(formatRelativeTime("2026-10-13T15:00:00Z", now)).toBe("hace 3 horas");
  });

  it("vuelve a la fecha completa pasado medio día", () => {
    expect(formatRelativeTime("2026-10-12T10:00:00Z", now)).not.toMatch(/^hace/);
  });
});
