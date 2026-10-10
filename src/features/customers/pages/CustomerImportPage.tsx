import { SpreadsheetImportWizard } from "@/components/imports/SpreadsheetImportWizard";
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
  return (
    <SpreadsheetImportWizard
      eyebrow="Contactos"
      title="Importar contactos"
      description="Carga contactos de forma masiva con validación previa por fila."
      plural="clientes"
      backTo="/customers"
      templateName="plantilla-clientes.xlsx"
      errorFilePrefix="clientes-no-importados"
      fields={fields}
      columns={[
        { key: "name", label: "Cliente" },
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
