import type {
  OperationLabel,
  OperationLabels,
  OperationModules,
  OperationSettings,
} from "../api/operationSettingsApi";

export interface OperationTerms {
  labels: OperationLabels;
  modules: OperationModules;
}

/** The "general" industry profile, used while the company settings load or if they fail. */
export const defaultOperationTerms: OperationTerms = {
  labels: {
    customer: { singular: "Contacto", plural: "Contactos" },
    project: { singular: "Seguimiento", plural: "Seguimientos" },
    visit: { singular: "Visita", plural: "Visitas" },
  },
  modules: { deliveries: true, catalog: true },
};

const pick = (label: OperationLabel | undefined, fallback: OperationLabel) => ({
  singular: label?.singular?.trim() || fallback.singular,
  plural: label?.plural?.trim() || fallback.plural,
});

/** Builds the terms from the API response, filling any blank label with the default. */
export function toOperationTerms(settings?: OperationSettings | null): OperationTerms {
  if (!settings) return defaultOperationTerms;
  const fallback = defaultOperationTerms.labels;
  return {
    labels: {
      customer: pick(settings.labels?.customer, fallback.customer),
      project: pick(settings.labels?.project, fallback.project),
      visit: pick(settings.labels?.visit, fallback.visit),
    },
    modules: {
      deliveries: settings.modules?.deliveries ?? true,
      catalog: settings.modules?.catalog ?? true,
    },
  };
}

/** Lowercases the first letter for use inside a sentence, keeping acronyms ("CRM") intact. */
export const inSentence = (label: string) =>
  label.length > 1 && label[1] === label[1].toUpperCase() && /\p{L}/u.test(label[1])
    ? label
    : label.charAt(0).toLowerCase() + label.slice(1);

// Spanish nouns ending in these suffixes are almost always feminine (obra, oportunidad, visión…).
const feminineEndings = /(a|dad|tad|tud|ión|umbre)$/;

/** Whether a label takes feminine articles, judged from its first word. */
export const isFeminine = (label: string) => {
  const head = label.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return feminineEndings.test(head);
};

/** "Nueva obra", "Nuevo cliente". */
export const newLabel = (singular: string) =>
  `${isFeminine(singular) ? "Nueva" : "Nuevo"} ${inSentence(singular)}`;

/** Picks the adjective that agrees with the label: gendered("Obra", "activos", "activas"). */
export const gendered = (singular: string, masculine: string, feminine: string) =>
  isFeminine(singular) ? feminine : masculine;
