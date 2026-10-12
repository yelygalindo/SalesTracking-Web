import { SpreadsheetImportWizard } from "@/components/imports/SpreadsheetImportWizard";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import { inSentence } from "@/features/operation-settings/services/operationTerms";
import { customerService } from "../services/customerService";

const text = (value: unknown) =>
  value === null || value === "" ? null : String(value).trim();
const fields = [
  { key: "name", label: "name", transform: text },
  { key: "companyName", label: "companyName", transform: text },
  { key: "phone", label: "phone", transform: text },
  { key: "email", label: "email", transform: text },
  { key: "address", label: "address", transform: text },
  { key: "latitude", label: "latitude" },
  { key: "longitude", label: "longitude" },
];

export function CustomerImportPage() {
  const {
    labels: { customer },
  } = useOperationTerms();
  const plural = inSentence(customer.plural);
  return (
    <SpreadsheetImportWizard
      eyebrow={customer.plural}
      title={`Importar base de datos de ${plural}`}
      description={`Carga tu base de datos de ${plural} de forma masiva con validación previa por fila.`}
      plural={plural}
      backTo="/customers"
      templateName="plantilla-clientes.xlsx"
      errorFilePrefix="clientes-no-importados"
      fields={fields}
      columns={[
        { key: "name", label: customer.singular },
        { key: "companyName", label: "Empresa" },
        { key: "phone", label: "Teléfono" },
        { key: "email", label: "Correo" },
      ]}
      errorColumns={[
        { key: "name", label: "Nombre" },
        { key: "companyName", label: "Empresa" },
      ]}
      api={{
        template: customerService.importTemplate,
        validate: customerService.validateImport,
        commit: customerService.commitImport,
      }}
    />
  );
}
