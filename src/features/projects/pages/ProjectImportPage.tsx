import { SpreadsheetImportWizard } from "@/components/imports/SpreadsheetImportWizard";
import { normalizeSpreadsheetDate } from "@/lib/import/spreadsheetValues";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import { inSentence } from "@/features/operation-settings/services/operationTerms";
import { projectService } from "../services/projectService";

const text = (value: unknown) =>
  value === null || value === "" ? null : String(value).trim();
const fields = [
  { key: "name", label: "name", transform: text },
  { key: "description", label: "description", transform: text },
  { key: "customerExternalId", label: "customerExternalId", transform: text },
  { key: "estimatedAmount", label: "estimatedAmount" },
  {
    key: "startDate",
    label: "startDate",
    aliases: ["startDateUtc"],
    transform: normalizeSpreadsheetDate,
  },
  {
    key: "expectedCloseDate",
    label: "expectedCloseDate",
    aliases: ["expectedCloseDateUtc"],
    transform: normalizeSpreadsheetDate,
  },
  { key: "progressPercentage", label: "progressPercentage" },
  {
    key: "actualCloseDate",
    label: "actualCloseDate",
    aliases: ["actualCloseDateUtc"],
    transform: normalizeSpreadsheetDate,
  },
  { key: "address", label: "address", transform: text },
  { key: "latitude", label: "latitude" },
  { key: "longitude", label: "longitude" },
];

const displayDate = (value: unknown) => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("es-BO").format(parsed);
};

export function ProjectImportPage() {
  const {
    labels: { customer, project },
  } = useOperationTerms();
  const plural = inSentence(project.plural);
  return (
    <SpreadsheetImportWizard
      eyebrow={project.plural}
      title={`Importar ${plural}`}
      description={`Carga ${plural} de forma masiva con validación previa por fila.`}
      plural={plural}
      backTo="/projects"
      templateName="plantilla-proyectos.xlsx"
      errorFilePrefix="proyectos-no-importados"
      uploadHint="Las fechas deben tener el formato YYYY-MM-DD."
      fields={fields}
      columns={[
        { key: "name", label: project.singular },
        { key: "customerExternalId", label: customer.singular },
        { key: "estimatedAmount", label: "Monto" },
        {
          key: "startDate",
          label: "Inicio",
          render: (value, row) => displayDate(value ?? row.startDateUtc),
        },
        { key: "progressPercentage", label: "Avance" },
      ]}
      errorColumns={[
        { key: "name", label: project.singular },
        { key: "customerExternalId", label: customer.singular },
      ]}
      api={{
        template: projectService.importTemplate,
        validate: projectService.validateImport,
        commit: projectService.commitImport,
      }}
    />
  );
}
