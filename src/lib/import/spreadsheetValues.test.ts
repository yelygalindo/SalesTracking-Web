import { describe, expect, it } from "vitest";
import {
  normalizeSpreadsheetBoolean,
  normalizeSpreadsheetDate,
} from "./spreadsheetValues";

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

describe("normalizeSpreadsheetBoolean", () => {
  it.each([
    [true, true],
    ["Sí", true],
    ["1", true],
    [false, false],
    ["No", false],
    ["0", false],
    ["", null],
  ])("convierte %s a %s", (value, expected) => {
    expect(normalizeSpreadsheetBoolean(value)).toBe(expected);
  });

  it("mantiene un texto inválido para que el backend lo reporte", () => {
    expect(normalizeSpreadsheetBoolean("quizás")).toBe("quizás");
  });
});
