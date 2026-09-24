import { SpreadsheetImportWizard } from "@/components/imports/SpreadsheetImportWizard";
import { normalizeSpreadsheetBoolean } from "@/lib/import/spreadsheetValues";
import { productImportsApi, unitImportsApi } from "../api/catalogApi";

type ImportKind = "products" | "units";
const text = (value: unknown) =>
  value === null || value === "" ? null : String(value).trim();
const yesNo = (value: unknown) =>
  value === true ? "Sí" : value === false ? "No" : String(value ?? "—");

const configs = {
  products: {
    plural: "productos",
    title: "Importar productos",
    description:
      "Carga productos de forma masiva con validación previa por fila.",
    backTo: "/catalog/products",
    templateName: "plantilla-productos.xlsx",
    errorFilePrefix: "productos-no-importados",
    api: productImportsApi,
    fields: [
      { key: "name", label: "name", transform: text },
      { key: "description", label: "description", transform: text },
      { key: "externalUnitId", label: "externalUnitId", transform: text },
      { key: "price", label: "price" },
      {
        key: "isActive",
        label: "isActive",
        transform: normalizeSpreadsheetBoolean,
      },
    ],
    columns: [
      { key: "name", label: "Producto" },
      { key: "externalUnitId", label: "Unidad" },
      { key: "price", label: "Precio" },
      { key: "isActive", label: "Activo", render: yesNo },
    ],
  },
  units: {
    plural: "unidades",
    title: "Importar unidades",
    description:
      "Carga unidades de forma masiva con validación previa por fila.",
    backTo: "/catalog/units",
    templateName: "plantilla-unidades.xlsx",
    errorFilePrefix: "unidades-no-importadas",
    api: unitImportsApi,
    fields: [
      { key: "name", label: "name", transform: text },
      { key: "symbol", label: "symbol", transform: text },
      { key: "description", label: "description", transform: text },
      {
        key: "allowsDecimals",
        label: "allowsDecimals",
        transform: normalizeSpreadsheetBoolean,
      },
      {
        key: "isActive",
        label: "isActive",
        transform: normalizeSpreadsheetBoolean,
      },
    ],
    columns: [
      { key: "name", label: "Unidad" },
      { key: "symbol", label: "Símbolo" },
      { key: "allowsDecimals", label: "Decimales", render: yesNo },
      { key: "isActive", label: "Activa", render: yesNo },
    ],
  },
} as const;

export function CatalogImportPage({ kind }: { kind: ImportKind }) {
  const config = configs[kind];
  return (
    <SpreadsheetImportWizard
      eyebrow="Productos"
      title={config.title}
      description={config.description}
      plural={config.plural}
      backTo={config.backTo}
      templateName={config.templateName}
      errorFilePrefix={config.errorFilePrefix}
      fields={[...config.fields]}
      columns={[...config.columns]}
      api={config.api}
    />
  );
}
