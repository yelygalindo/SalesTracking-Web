import { SpreadsheetImportDialog } from "@/components/imports/SpreadsheetImportDialog";
import { customerService } from "../services/customerService";

const text = (value: unknown) => value === null || value === "" ? null : String(value).trim();

export function CustomerSpreadsheetImport({ onCommitted }: { onCommitted: () => Promise<unknown> }) {
  return (
    <SpreadsheetImportDialog
      entityLabel="clientes"
      templateName="plantilla-clientes.xlsx"
      fields={[
        { key: "name", label: "name", transform: text },
        { key: "companyName", label: "companyName", transform: text },
        { key: "phone", label: "phone", transform: text },
        { key: "email", label: "email", transform: text },
        { key: "sellerExternalId", label: "sellerExternalId", transform: text },
        { key: "address", label: "address", transform: text },
        { key: "latitude", label: "latitude" },
        { key: "longitude", label: "longitude" },
      ]}
      downloadTemplate={customerService.importTemplate}
      validateRows={customerService.validateImport}
      commit={customerService.commitImport}
      onCommitted={onCommitted}
    />
  );
}
