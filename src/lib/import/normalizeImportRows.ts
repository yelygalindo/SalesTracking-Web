import type { SpreadsheetRow } from "@/types/spreadsheetImport";

const legacySellerExamples = new Set([
  "user-vendedor",
  "vendedor-ejemplo",
  "seller-example",
]);

export function normalizeOptionalSellerExternalId(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || legacySellerExamples.has(normalized.toLowerCase()))
    return null;
  return normalized;
}

export function normalizeImportRows(rows: SpreadsheetRow[]): SpreadsheetRow[] {
  return rows.map((row) =>
    "sellerExternalId" in row
      ? {
          ...row,
          sellerExternalId: normalizeOptionalSellerExternalId(
            row.sellerExternalId,
          ),
        }
      : { ...row },
  );
}
