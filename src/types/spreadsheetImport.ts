export type SpreadsheetRow = Record<string, unknown> & { rowNumber: number };
export interface ImportIssue { field: string; code: string; message: string }

export interface ImportPreviewRow {
  rowNumber: number;
  status: "valid" | "warning" | "invalid";
  data: SpreadsheetRow;
  errors: ImportIssue[];
  warnings: ImportIssue[];
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
