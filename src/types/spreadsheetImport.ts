export type SpreadsheetRow = Record<string, unknown> & { rowNumber: number };

export interface ImportPreviewRow {
  rowNumber: number;
  status: "valid" | "warning" | "invalid";
  data: SpreadsheetRow;
  errors?: Array<string | { message: string }>;
  warnings?: Array<string | { message: string }>;
  messages?: Array<string | { message: string }>;
}

export interface ImportPreview {
  importId: string;
  expiresAtUtc: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  rows: ImportPreviewRow[];
}

export interface ImportCommitRequest {
  includeAllValidRows: boolean;
  includeWarningRows: boolean;
  selectedRows: number[];
}

export interface ImportCommitResult {
  created?: number;
  failed?: number;
  message?: string;
  items?: Array<{ rowNumber: number; succeeded: boolean; externalId?: string | null; message: string }>;
}
