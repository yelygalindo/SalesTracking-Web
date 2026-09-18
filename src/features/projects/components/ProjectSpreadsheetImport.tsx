import type { CellValue } from "read-excel-file/browser";
import { SpreadsheetImportDialog } from "@/components/imports/SpreadsheetImportDialog";
import { projectService } from "../services/projectService";

const utc = (value: CellValue | null) => {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};
const text = (value: CellValue | null) => value === null || value === "" ? null : String(value).trim();

export function ProjectSpreadsheetImport({ onCommitted }: { onCommitted: () => Promise<unknown> }) {
  return (
    <SpreadsheetImportDialog
      entityLabel="proyectos"
      templateName="plantilla-proyectos.xlsx"
      fields={[
        { key: "name", label: "name", transform: text },
        { key: "description", label: "description", transform: text },
        { key: "customerExternalId", label: "customerExternalId", transform: text },
        { key: "sellerExternalId", label: "sellerExternalId", transform: text },
        { key: "estimatedAmount", label: "estimatedAmount" },
        { key: "startDateUtc", label: "startDateUtc", transform: utc },
        { key: "expectedCloseDateUtc", label: "expectedCloseDateUtc", transform: utc },
        { key: "progressPercentage", label: "progressPercentage" },
        { key: "actualCloseDateUtc", label: "actualCloseDateUtc", transform: utc },
        { key: "address", label: "address", transform: text },
        { key: "latitude", label: "latitude" },
        { key: "longitude", label: "longitude" },
      ]}
      downloadTemplate={projectService.importTemplate}
      validateRows={projectService.validateImport}
      commit={projectService.commitImport}
      onCommitted={onCommitted}
    />
  );
}
