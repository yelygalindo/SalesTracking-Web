import { describe, expect, it } from "vitest";
import { normalizeSpreadsheetDate } from "./spreadsheetValues";

describe("normalizeSpreadsheetDate", () => {
  it("mantiene las fechas simples", () => {
    expect(normalizeSpreadsheetDate("2026-09-18")).toBe("2026-09-18");
  });

  it("convierte fechas anteriores con hora a YYYY-MM-DD", () => {
    expect(normalizeSpreadsheetDate("2026-09-18T12:00:00Z")).toBe("2026-09-18");
  });

  it("convierte las celdas de fecha de Excel sin agregar una hora", () => {
    expect(normalizeSpreadsheetDate(new Date(2026, 8, 18))).toBe("2026-09-18");
  });

  it("mantiene los valores inválidos para que el backend los reporte", () => {
    expect(normalizeSpreadsheetDate("fecha incorrecta")).toBe(
      "fecha incorrecta",
    );
  });
});
