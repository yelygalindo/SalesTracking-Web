import { useMemo, useRef, useState, type DragEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { notify } from "@/components/feedback/toast";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { exportExcel } from "@/lib/export/exportExcel";
import { readSpreadsheet, type SpreadsheetField } from "@/lib/import/readSpreadsheet";
import type { ImportCommitResult, ImportPreview, ImportPreviewRow, SpreadsheetRow } from "@/types/spreadsheetImport";
import { customerService } from "../services/customerService";

const text = (value: unknown) => value === null || value === "" ? null : String(value).trim();
const fields: SpreadsheetField[] = [
  { key: "name", label: "name", transform: text },
  { key: "companyName", label: "companyName", transform: text },
  { key: "phone", label: "phone", transform: text },
  { key: "email", label: "email", transform: text },
  { key: "sellerExternalId", label: "sellerExternalId", transform: text },
  { key: "address", label: "address", transform: text },
  { key: "latitude", label: "latitude" },
  { key: "longitude", label: "longitude" },
];
type StatusFilter = "all" | ImportPreviewRow["status"];

export function CustomerImportPage() {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const template = useMutation({
    mutationFn: customerService.importTemplate,
    onSuccess: (blob) => downloadBlob(blob, "plantilla-clientes.xlsx"),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const validation = useMutation({
    mutationFn: customerService.validateImport,
    onSuccess: (value) => {
      setPreview(value);
      setSelectedRows(value.rows.filter((row) => row.status === "valid").map((row) => row.rowNumber));
      setStep(2);
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const commit = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error("La validación ya no está disponible.");
      return customerService.commitImport(preview.importId, {
        includeAllValidRows: false,
        includeWarningRows: false,
        selectedRows,
      });
    },
    onSuccess: (value) => {
      setResult(value);
      setStep(3);
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const loadFile = async (nextFile?: File) => {
    if (!nextFile) return;
    try {
      const parsed = await readSpreadsheet(nextFile, fields);
      setFile(nextFile);
      setRows(parsed);
      setPreview(null);
      setSelectedRows([]);
    } catch (error) {
      setFile(null);
      setRows([]);
      notify(error instanceof Error ? error.message : "No fue posible leer el archivo.", "error");
    }
  };
  const reset = () => {
    setStep(0);
    setFile(null);
    setRows([]);
    setPreview(null);
    setSelectedRows([]);
    setResult(null);
    setFilter("all");
  };
  const visibleRows = useMemo(
    () => preview?.rows.filter((row) => filter === "all" || row.status === filter) ?? [],
    [filter, preview],
  );
  const failedItems = result?.items?.filter((item) => !item.succeeded) ?? [];
  const omitted = Math.max(0, (preview?.totalRows ?? 0) - selectedRows.length);
  const downloadErrors = () => {
    const byNumber = new Map(preview?.rows.map((row) => [row.rowNumber, row]));
    exportExcel(
      `clientes-no-importados-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { label: "Fila", value: (item) => item.rowNumber },
        { label: "Nombre", value: (item) => byNumber.get(item.rowNumber)?.data.name ?? "" },
        { label: "Empresa", value: (item) => byNumber.get(item.rowNumber)?.data.companyName ?? "" },
        { label: "Motivo", value: (item) => item.message },
      ],
      failedItems,
    );
  };

  return (
    <main className="customers-content customer-import-page">
      <PageHeader
        eyebrow="Clientes"
        title="Importar clientes"
        description="Carga clientes de forma masiva con validación previa por fila."
        action={<Link className="back-button" to="/customers"><ArrowLeft /> Volver al listado</Link>}
      />

      {step === 0 ? (
        <section className="import-start-grid">
          <article className="import-action-card">
            <span><Download /></span>
            <h2>Obtener plantilla</h2>
            <p>Descarga el archivo Excel con las columnas admitidas y ejemplos para completar.</p>
            <button disabled={template.isPending} onClick={() => template.mutate()}>
              {template.isPending ? "Descargando…" : "Descargar plantilla Excel"}
            </button>
          </article>
          <article className="import-action-card featured">
            <span><Upload /></span>
            <h2>Importar clientes</h2>
            <p>Sube la plantilla, revisa las validaciones y selecciona qué registros importar.</p>
            <button className="action-primary" onClick={() => setStep(1)}>Iniciar importación</button>
          </article>
        </section>
      ) : (
        <>
          <WizardSteps current={step} />
          {step === 1 && (
            <section className="import-wizard-card">
              <header><h2>Cargar archivo</h2><p>Selecciona o arrastra una plantilla `.xlsx` con un máximo de 1000 registros.</p></header>
              <input ref={input} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { void loadFile(event.target.files?.[0]); event.target.value = ""; }} />
              <FileDropZone file={file} count={rows.length} onSelect={() => input.current?.click()} onDrop={(nextFile) => void loadFile(nextFile)} onClear={() => { setFile(null); setRows([]); }} />
              <footer className="import-wizard-actions">
                <button onClick={reset}>Cancelar</button>
                <button className="action-primary" disabled={!rows.length || validation.isPending} onClick={() => validation.mutate(rows)}>
                  {validation.isPending ? "Validando…" : "Continuar a revisión"}
                </button>
              </footer>
            </section>
          )}
          {step === 2 && preview && (
            <section className="import-wizard-card import-review-card">
              <header><h2>Revisar datos</h2><p>Selecciona los registros que deseas importar. Las filas con errores bloqueantes no pueden seleccionarse.</p></header>
              <div className="import-review-toolbar">
                <div className="import-status-filters">
                  {(["all", "valid", "warning", "invalid"] as StatusFilter[]).map((status) => (
                    <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>
                      {statusLabel(status)} {status !== "all" && `(${statusCount(preview, status)})`}
                    </button>
                  ))}
                </div>
                <strong>{selectedRows.length} seleccionados</strong>
              </div>
              <ImportDataGrid rows={visibleRows} selectedRows={selectedRows} onToggle={(rowNumber) => setSelectedRows((current) => current.includes(rowNumber) ? current.filter((value) => value !== rowNumber) : [...current, rowNumber])} />
              <footer className="import-wizard-actions">
                <button onClick={() => setStep(1)}>Volver</button>
                <button className="action-primary" disabled={!selectedRows.length || commit.isPending} onClick={() => commit.mutate()}>
                  {commit.isPending ? "Importando…" : `Importar ${selectedRows.length} clientes`}
                </button>
              </footer>
            </section>
          )}
          {step === 3 && result && (
            <section className="import-wizard-card import-result-card">
              <div className="import-result-heading"><span><CheckCircle2 /></span><div><h2>Importación finalizada</h2><p>{result.message || "El archivo fue procesado correctamente."}</p></div></div>
              <div className="import-result-metrics">
                <article><span>Procesados</span><strong>{result.items?.length ?? selectedRows.length}</strong></article>
                <article className="success"><span>Importados</span><strong>{result.created ?? 0}</strong></article>
                <article><span>Omitidos</span><strong>{omitted}</strong></article>
                <article className="danger"><span>Con errores</span><strong>{result.failed ?? failedItems.length}</strong></article>
              </div>
              {failedItems.length > 0 && <div className="import-failed-records"><header><div><h3>Registros no importados</h3><p>Corrige estos registros antes de volver a intentarlo.</p></div><button onClick={downloadErrors}><Download /> Descargar errores</button></header>{failedItems.map((item) => <div key={item.rowNumber}><XCircle /><strong>Fila {item.rowNumber}</strong><span>{item.message}</span></div>)}</div>}
              <footer className="import-wizard-actions"><Link to="/customers">Ir al listado</Link><button className="action-primary" onClick={reset}>Nueva importación</button></footer>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function WizardSteps({ current }: { current: number }) {
  return <ol className="import-wizard-steps">{["Cargar archivo", "Revisar datos", "Resultado"].map((label, index) => { const number = index + 1; return <li className={current === number ? "active" : current > number ? "complete" : ""} key={label}><span>{number}</span><strong>{label}</strong></li>; })}</ol>;
}

function FileDropZone({ file, count, onSelect, onDrop, onClear }: { file: File | null; count: number; onSelect: () => void; onDrop: (file: File) => void; onClear: () => void }) {
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); const nextFile = event.dataTransfer.files[0]; if (nextFile) onDrop(nextFile); };
  return <div className={`import-drop-zone ${file ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={drop}>{file ? <><FileSpreadsheet /><div><strong>{file.name}</strong><span>{count.toLocaleString("es-BO")} registros detectados</span></div><button aria-label="Quitar archivo" onClick={onClear}><XCircle /></button></> : <><Upload /><strong>Arrastra tu archivo aquí</strong><span>o selecciona un archivo desde tu equipo</span><button onClick={onSelect}>Seleccionar archivo</button><small>Formato permitido: XLSX</small></>}</div>;
}

function ImportDataGrid({ rows, selectedRows, onToggle }: { rows: ImportPreviewRow[]; selectedRows: number[]; onToggle: (rowNumber: number) => void }) {
  return <div className="import-data-grid"><table><thead><tr><th aria-label="Seleccionar" /><th>Fila</th><th>Cliente</th><th>Empresa</th><th>Teléfono</th><th>Correo</th><th>Vendedor</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{rows.map((row) => { const issues = [...row.errors, ...row.warnings]; return <tr className={`row-${row.status}`} key={row.rowNumber}><td><input type="checkbox" aria-label={`Seleccionar fila ${row.rowNumber}`} disabled={row.status === "invalid"} checked={selectedRows.includes(row.rowNumber)} onChange={() => onToggle(row.rowNumber)} /></td><td>{row.rowNumber}</td><td><strong>{String(row.data.name ?? "—")}</strong></td><td>{String(row.data.companyName ?? "—")}</td><td>{String(row.data.phone ?? "—")}</td><td>{String(row.data.email ?? "—")}</td><td>{String(row.data.sellerExternalId ?? "—")}</td><td><span className={`import-status ${row.status}`}>{statusLabel(row.status)}</span></td><td>{issues.length ? <details><summary>{issues.length} {issues.length === 1 ? "detalle" : "detalles"}</summary>{issues.map((issue, index) => <p key={`${issue.message}-${index}`}><strong>{issue.field}</strong>{issue.message}</p>)}</details> : "—"}</td></tr>; })}</tbody></table></div>;
}

const statusLabel = (status: StatusFilter) => ({ all: "Todos", valid: "Válido", warning: "Advertencia", invalid: "Error" })[status];
const statusCount = (preview: ImportPreview, status: Exclude<StatusFilter, "all">) => ({ valid: preview.validRows, warning: preview.warningRows, invalid: preview.invalidRows })[status];
