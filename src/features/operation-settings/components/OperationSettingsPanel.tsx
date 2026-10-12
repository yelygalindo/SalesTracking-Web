import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, SlidersHorizontal } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { FormField } from "@/components/forms/FormField";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { useIndustries } from "@/features/industries/hooks/useIndustries";
import {
  operationSettingsApi,
  type OperationSettings,
  type OperationSettingsInput,
} from "../api/operationSettingsApi";
import {
  operationSettingsQueryKey,
  useOperationSettings,
} from "../hooks/useOperationTerms";
import { newLabel } from "../services/operationTerms";

const toInput = ({ labels, modules }: OperationSettings): OperationSettingsInput => ({
  customerLabelSingular: labels.customer.singular,
  customerLabelPlural: labels.customer.plural,
  projectLabelSingular: labels.project.singular,
  projectLabelPlural: labels.project.plural,
  visitLabelSingular: labels.visit.singular,
  visitLabelPlural: labels.visit.plural,
  deliveriesEnabled: modules.deliveries,
  catalogEnabled: modules.catalog,
});

type LabelKey = Exclude<keyof OperationSettingsInput, "deliveriesEnabled" | "catalogEnabled">;

const labelGroups: {
  title: string;
  hint: string;
  singular: LabelKey;
  plural: LabelKey;
}[] = [
  {
    title: "Cartera",
    hint: "Personas u organizaciones que atiende tu equipo.",
    singular: "customerLabelSingular",
    plural: "customerLabelPlural",
  },
  {
    title: "Trabajo en curso",
    hint: "Lo que tu equipo gestiona para cada cliente.",
    singular: "projectLabelSingular",
    plural: "projectLabelPlural",
  },
  {
    title: "Registro en terreno",
    hint: "Cada paso del personal de campo por un lugar.",
    singular: "visitLabelSingular",
    plural: "visitLabelPlural",
  },
];

const labelMaxLength = 60;

export function OperationSettingsPanel() {
  const cache = useQueryClient();
  const settings = useOperationSettings();
  const industries = useIndustries();
  const [form, setForm] = useState<OperationSettingsInput>();
  const [industryCode, setIndustryCode] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setForm(toInput(settings.data));
    setIndustryCode(settings.data.industryCode);
  }, [settings.data]);

  // Every change returns the resulting settings: the menu and the pages update right away.
  const applied = (message: string) => (result: OperationSettings) => {
    cache.setQueryData(operationSettingsQueryKey, result);
    notify(result.message || message);
  };
  const changeIndustry = useMutation({
    mutationFn: () => operationSettingsApi.changeIndustry(industryCode),
    onSuccess: applied("Rubro actualizado correctamente."),
  });
  const customize = useMutation({
    mutationFn: (input: OperationSettingsInput) => operationSettingsApi.customize(input),
    onSuccess: applied("Personalización guardada correctamente."),
  });
  const reset = useMutation({
    mutationFn: operationSettingsApi.reset,
    onSuccess: (result) => {
      setConfirmReset(false);
      applied("Se restablecieron los valores del rubro.")(result);
    },
  });

  const current = settings.data;
  const busy = changeIndustry.isPending || customize.isPending || reset.isPending;
  const field = (key: LabelKey) => ({
    value: form?.[key] ?? "",
    maxLength: labelMaxLength,
    required: true,
    onChange: (event: { target: { value: string } }) =>
      setForm((value) => value && { ...value, [key]: event.target.value }),
  });

  return (
    <DataState
      loading={settings.isLoading}
      error={settings.error}
      onRetry={settings.refetch}
      isEmpty={!settings.data}
      empty="No encontramos la configuración de la operación de tu empresa."
    >
      {current && form && (
        <div className="admin-company-layout">
          <section className="admin-card">
            <header className="admin-card-header">
              <span>
                <Building2 />
              </span>
              <div>
                <h2>Rubro de la empresa</h2>
                <p>
                  Define los nombres y módulos predeterminados de la operación.
                </p>
              </div>
            </header>
            <form
              className="customer-form admin-form"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                changeIndustry.mutate();
              }}
            >
              <FormField label="Rubro" required>
                <select
                  required
                  value={industryCode}
                  disabled={!industries.data}
                  onChange={(event) => setIndustryCode(event.target.value)}
                >
                  {!industries.data?.some((item) => item.code === industryCode) && (
                    <option value={industryCode}>{current.industryName}</option>
                  )}
                  {industries.data?.map((industry) => (
                    <option key={industry.code} value={industry.code}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <p className="form-hint">
                {current.source === "custom"
                  ? "La empresa usa una personalización. Al cambiar el rubro se conserva; usa «Restablecer valores del rubro» para aplicar los del nuevo rubro."
                  : `La empresa usa los valores del rubro ${current.industryName}.`}
              </p>
              {industries.isError && (
                <p className="form-error">
                  No fue posible consultar el catálogo de rubros.
                </p>
              )}
              {changeIndustry.error && (
                <p className="form-error">{changeIndustry.error.message}</p>
              )}
              <div className="admin-form-actions">
                <button
                  className="action-primary"
                  disabled={busy || industryCode === current.industryCode}
                >
                  {changeIndustry.isPending ? "Guardando…" : "Cambiar rubro"}
                </button>
              </div>
            </form>
          </section>
          <section className="admin-card">
            <header className="admin-card-header">
              <span>
                <SlidersHorizontal />
              </span>
              <div>
                <h2>Nombres y módulos</h2>
                <p>
                  {current.source === "custom"
                    ? "Personalizado para tu empresa."
                    : `Valores del rubro ${current.industryName}. Al guardar, quedan personalizados.`}
                </p>
              </div>
            </header>
            <form
              className="customer-form admin-form"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                customize.mutate(form);
              }}
            >
              {labelGroups.map((group) => (
                <fieldset className="customer-form-extras" key={group.title}>
                  <legend>{group.title}</legend>
                  <p className="form-hint">{group.hint}</p>
                  <FormField label="Singular" required>
                    <input {...field(group.singular)} />
                  </FormField>
                  <FormField label="Plural" required>
                    <input {...field(group.plural)} />
                  </FormField>
                </fieldset>
              ))}
              <p className="form-hint">
                Vista previa: {form.customerLabelPlural || "—"} ·{" "}
                {form.projectLabelSingular.trim()
                  ? newLabel(form.projectLabelSingular.trim())
                  : "—"}{" "}
                · {form.visitLabelPlural || "—"} en curso
              </p>
              <label className="catalog-option">
                <input
                  type="checkbox"
                  checked={form.deliveriesEnabled}
                  onChange={(event) =>
                    setForm({ ...form, deliveriesEnabled: event.target.checked })
                  }
                />
                <span>
                  <strong>Compromisos y entregas</strong>
                  <small>Muestra las entregas y su reporte en el menú.</small>
                </span>
              </label>
              <label className="catalog-option">
                <input
                  type="checkbox"
                  checked={form.catalogEnabled}
                  onChange={(event) =>
                    setForm({ ...form, catalogEnabled: event.target.checked })
                  }
                />
                <span>
                  <strong>Catálogo</strong>
                  <small>Muestra productos, unidades y sus importaciones en el menú.</small>
                </span>
              </label>
              {customize.error && (
                <p className="form-error">{customize.error.message}</p>
              )}
              {reset.error && <p className="form-error">{reset.error.message}</p>}
              <div className="admin-form-actions operation-settings-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy || current.source !== "custom"}
                  onClick={() => setConfirmReset(true)}
                >
                  Restablecer valores del rubro
                </button>
                <button className="action-primary" disabled={busy}>
                  {customize.isPending ? "Guardando…" : "Guardar personalización"}
                </button>
              </div>
            </form>
          </section>
          <ConfirmDialog
            open={confirmReset}
            title="Restablecer valores del rubro"
            description={`Se descartará la personalización y se usarán los nombres y módulos del rubro ${current.industryName}.`}
            confirmLabel="Restablecer"
            busy={reset.isPending}
            onConfirm={() => reset.mutate()}
            onCancel={() => setConfirmReset(false)}
          />
        </div>
      )}
    </DataState>
  );
}
