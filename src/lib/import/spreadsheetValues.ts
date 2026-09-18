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
