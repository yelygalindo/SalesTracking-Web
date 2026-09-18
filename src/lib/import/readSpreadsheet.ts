import type { CellValue } from "read-excel-file/browser";
import type { SpreadsheetRow } from "@/types/spreadsheetImport";

export type SpreadsheetField = {
  key: string;
  label: string;
  transform?: (value: CellValue | null) => unknown;
};

export async function readSpreadsheet(
  file: File,
  fields: SpreadsheetField[],
  maxRows = 1000,
): Promise<SpreadsheetRow[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw new Error("Selecciona un archivo XLSX.");

  const { readSheet } = await import("read-excel-file/browser");
  const sheet = await readSheet(file);
  if (sheet.length < 2)
    throw new Error("La plantilla no contiene filas para importar.");

  const headers = sheet[0].map((value) =>
    String(value ?? "").trim().toLowerCase(),
  );
  const indexes = fields.map((field) => headers.indexOf(field.key.toLowerCase()));
  const missing = fields.filter((_, index) => indexes[index] < 0);
  if (missing.length)
    throw new Error(
      `Faltan columnas: ${missing.map((field) => field.label).join(", ")}.`,
    );

  const sourceRows = sheet
    .slice(1)
    .map((cells, index) => ({ cells, rowNumber: index + 2 }))
    .filter(({ cells }) =>
      cells.some((cell) => cell !== null && cell !== ""),
    );
  if (!sourceRows.length)
    throw new Error("La plantilla no contiene filas para importar.");
  if (sourceRows.length > maxRows)
    throw new Error(`El archivo no puede superar ${maxRows} filas.`);

  return sourceRows.map(({ cells, rowNumber }) => {
    const row: SpreadsheetRow = { rowNumber };
    fields.forEach((field, fieldIndex) => {
      const value = cells[indexes[fieldIndex]] ?? null;
      row[field.key] = field.transform ? field.transform(value) : value;
    });
    return row;
  });
}
