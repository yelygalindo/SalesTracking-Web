export function normalizeSpreadsheetDate(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const normalized = String(value).trim();
  const datePrefix = normalized.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return datePrefix ?? normalized;
}

export function normalizeSpreadsheetBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (value === null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sí", "si", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return value;
}
