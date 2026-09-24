import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { notify } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/AppShell";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { exportExcel } from "@/lib/export/exportExcel";
import {
  readSpreadsheet,
  type SpreadsheetField,
} from "@/lib/import/readSpreadsheet";
import type {
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ImportPreviewRow,
  SpreadsheetRow,
} from "@/types/spreadsheetImport";

type StatusFilter = "all" | ImportPreviewRow["status"];
export type SpreadsheetImportApi = {
  template: () => Promise<Blob>;
  validate: (rows: SpreadsheetRow[]) => Promise<ImportPreview>;
  commit: (
    importId: string,
    request: ImportCommitRequest,
  ) => Promise<ImportCommitResult>;
};
export type SpreadsheetGridColumn = {
  key: string;
  label: string;
  render?: (value: unknown, row: SpreadsheetRow) => string;
};
export type SpreadsheetErrorColumn = {
  key: string;
  label: string;
};

export interface SpreadsheetImportWizardProps {
  eyebrow: string;
  title: string;
  description: string;
  plural: string;
  backTo: string;
  templateName: string;
  errorFilePrefix: string;
  fields: SpreadsheetField[];
  columns: SpreadsheetGridColumn[];
  errorColumns?: SpreadsheetErrorColumn[];
  uploadHint?: string;
  api: SpreadsheetImportApi;
}

export function SpreadsheetImportWizard(
  props: SpreadsheetImportWizardProps,
) {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const template = useMutation({
    mutationFn: props.api.template,
    onSuccess: (blob) => downloadBlob(blob, props.templateName),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const validation = useMutation({
    mutationFn: props.api.validate,
    onSuccess: (value) => {
      setPreview(value);
      setSelectedRows(
        value.rows
          .filter((row) => row.status === "valid")
          .map((row) => row.rowNumber),
      );
      setStep(2);
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const commit = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error("La validación ya no está disponible.");
      return props.api.commit(preview.importId, {
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
      const parsed = await readSpreadsheet(nextFile, props.fields);
      setFile(nextFile);
      setRows(parsed);
      setPreview(null);
      setSelectedRows([]);
    } catch (error) {
      setFile(null);
      setRows([]);
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible leer el archivo.",
        "error",
      );
    }
  };
  const reset = () => {
    setStep(0);
    setFile(null);
    setRows([]);
    setPreview(null);
    setSelectedRows([]);
    setFilter("all");
    setResult(null);
  };
  const visibleRows = useMemo(
    () =>
      preview?.rows.filter(
        (row) => filter === "all" || row.status === filter,
      ) ?? [],
    [filter, preview],
  );
  const failedItems = result?.items?.filter((item) => !item.succeeded) ?? [];
  const omitted = Math.max(0, (preview?.totalRows ?? 0) - selectedRows.length);
  const downloadErrors = () => {
    const byNumber = new Map(preview?.rows.map((row) => [row.rowNumber, row]));
    exportExcel(
      `${props.errorFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { label: "Fila", value: (item) => item.rowNumber },
        ...(props.errorColumns ?? [{ key: "name", label: "Nombre" }]).map(
          (column) => ({
            label: column.label,
            value: (item: (typeof failedItems)[number]) =>
              byNumber.get(item.rowNumber)?.data[column.key] ?? "",
          }),
        ),
        { label: "Motivo", value: (item) => item.message },
      ],
      failedItems,
    );
  };

  return (
    <main className="customers-content customer-import-page">
      <PageHeader
        eyebrow={props.eyebrow}
        title={props.title}
        description={props.description}
        action={
          <Link className="back-button" to={props.backTo}>
            <ArrowLeft /> Volver al listado
          </Link>
        }
      />
      {step === 0 ? (
        <ImportStart
          title={props.title}
          downloading={template.isPending}
          onDownload={() => template.mutate()}
          onStart={() => setStep(1)}
        />
      ) : (
        <>
          <WizardSteps current={step} />
          {step === 1 && (
            <UploadStep
              file={file}
              rowCount={rows.length}
              hint={props.uploadHint}
              validating={validation.isPending}
              inputRef={input}
              onFile={loadFile}
              onClear={() => {
                setFile(null);
                setRows([]);
              }}
              onCancel={reset}
              onValidate={() => validation.mutate(rows)}
            />
          )}
          {step === 2 && preview && (
            <ReviewStep
              plural={props.plural}
              columns={props.columns}
              rows={visibleRows}
              preview={preview}
              filter={filter}
              selectedRows={selectedRows}
              committing={commit.isPending}
              onFilter={setFilter}
              onToggle={(rowNumber) =>
                setSelectedRows((current) =>
                  current.includes(rowNumber)
                    ? current.filter((value) => value !== rowNumber)
                    : [...current, rowNumber],
                )
              }
              onBack={() => setStep(1)}
              onCommit={() => commit.mutate()}
            />
          )}
          {step === 3 && result && (
            <ResultStep
              backTo={props.backTo}
              result={result}
              processed={result.items?.length ?? selectedRows.length}
              omitted={omitted}
              failedItems={failedItems}
              onDownloadErrors={downloadErrors}
              onReset={reset}
            />
          )}
        </>
      )}
    </main>
  );
}

function ImportStart({ title, downloading, onDownload, onStart }: {
  title: string; downloading: boolean; onDownload: () => void; onStart: () => void;
}) {
  return <section className="import-start-grid"><article className="import-action-card"><span><Download /></span><h2>Obtener plantilla</h2><p>Descarga el archivo Excel con las columnas admitidas y ejemplos para completar.</p><button disabled={downloading} onClick={onDownload}>{downloading ? "Descargando…" : "Descargar plantilla Excel"}</button></article><article className="import-action-card featured"><span><Upload /></span><h2>{title}</h2><p>Sube la plantilla, revisa las validaciones y selecciona qué registros importar.</p><button className="action-primary" onClick={onStart}>Iniciar importación</button></article></section>;
}

function WizardSteps({ current }: { current: number }) {
  return <ol className="import-wizard-steps">{["Cargar archivo", "Revisar datos", "Resultado"].map((label, index) => { const number = index + 1; return <li className={current === number ? "active" : current > number ? "complete" : ""} key={label}><span>{number}</span><strong>{label}</strong></li>; })}</ol>;
}

function UploadStep({ file, rowCount, hint, validating, inputRef, onFile, onClear, onCancel, onValidate }: {
  file: File | null; rowCount: number; hint?: string; validating: boolean;
  inputRef: RefObject<HTMLInputElement | null>; onFile: (file?: File) => Promise<void>;
  onClear: () => void; onCancel: () => void; onValidate: () => void;
}) {
  return <section className="import-wizard-card"><header><h2>Cargar archivo</h2><p>Selecciona o arrastra una plantilla `.xlsx` con un máximo de 1000 registros.{hint ? ` ${hint}` : ""}</p></header><input ref={inputRef} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ""; }} /><FileDropZone file={file} count={rowCount} onSelect={() => inputRef.current?.click()} onDrop={(nextFile) => void onFile(nextFile)} onClear={onClear} /><footer className="import-wizard-actions"><button onClick={onCancel}>Cancelar</button><button className="action-primary" disabled={!rowCount || validating} onClick={onValidate}>{validating ? "Validando…" : "Continuar a revisión"}</button></footer></section>;
}

function FileDropZone({ file, count, onSelect, onDrop, onClear }: {
  file: File | null; count: number; onSelect: () => void; onDrop: (file: File) => void; onClear: () => void;
}) {
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); const nextFile = event.dataTransfer.files[0]; if (nextFile) onDrop(nextFile); };
  return <div className={`import-drop-zone ${file ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={drop}>{file ? <><FileSpreadsheet /><div><strong>{file.name}</strong><span>{count.toLocaleString("es-BO")} registros detectados</span></div><button aria-label="Quitar archivo" onClick={onClear}><XCircle /></button></> : <><Upload /><strong>Arrastra tu archivo aquí</strong><span>o selecciona un archivo desde tu equipo</span><button onClick={onSelect}>Seleccionar archivo</button><small>Formato permitido: XLSX</small></>}</div>;
}

function ReviewStep({ plural, columns, rows, preview, filter, selectedRows, committing, onFilter, onToggle, onBack, onCommit }: {
  plural: string; columns: SpreadsheetGridColumn[]; rows: ImportPreviewRow[]; preview: ImportPreview;
  filter: StatusFilter; selectedRows: number[]; committing: boolean; onFilter: (value: StatusFilter) => void;
  onToggle: (rowNumber: number) => void; onBack: () => void; onCommit: () => void;
}) {
  return <section className="import-wizard-card import-review-card"><header><h2>Revisar datos</h2><p>Selecciona los registros que deseas importar. Las filas con errores bloqueantes no pueden seleccionarse.</p></header><ReviewToolbar filter={filter} preview={preview} selectedCount={selectedRows.length} onFilter={onFilter} /><ImportGrid columns={columns} rows={rows} selectedRows={selectedRows} onToggle={onToggle} /><footer className="import-wizard-actions"><button onClick={onBack}>Volver</button><button className="action-primary" disabled={!selectedRows.length || committing} onClick={onCommit}>{committing ? "Importando…" : `Importar ${selectedRows.length} ${plural}`}</button></footer></section>;
}

function ReviewToolbar({ filter, preview, selectedCount, onFilter }: {
  filter: StatusFilter; preview: ImportPreview; selectedCount: number; onFilter: (value: StatusFilter) => void;
}) {
  return <div className="import-review-toolbar"><div className="import-status-filters">{(["all", "valid", "warning", "invalid"] as StatusFilter[]).map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => onFilter(status)}>{statusLabel(status)} {status !== "all" && `(${statusCount(preview, status)})`}</button>)}</div><strong>{selectedCount} seleccionados</strong></div>;
}

function ImportGrid({ columns, rows, selectedRows, onToggle }: {
  columns: SpreadsheetGridColumn[]; rows: ImportPreviewRow[]; selectedRows: number[]; onToggle: (rowNumber: number) => void;
}) {
  return <div className="import-data-grid"><table><thead><tr><th aria-label="Seleccionar" /><th>Fila</th>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Estado</th><th>Detalle</th></tr></thead><tbody>{rows.map((row) => { const issues = [...row.errors, ...row.warnings]; return <tr className={`row-${row.status}`} key={row.rowNumber}><td><input type="checkbox" aria-label={`Seleccionar fila ${row.rowNumber}`} disabled={row.status === "invalid"} checked={selectedRows.includes(row.rowNumber)} onChange={() => onToggle(row.rowNumber)} /></td><td>{row.rowNumber}</td>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row.data[column.key], row.data) : String(row.data[column.key] ?? "—")}</td>)}<td><span className={`import-status ${row.status}`}>{statusLabel(row.status)}</span></td><td>{issues.length ? <details><summary>{issues.length} {issues.length === 1 ? "detalle" : "detalles"}</summary>{issues.map((issue, index) => <p key={`${issue.message}-${index}`}><strong>{issue.field}</strong>{issue.message}</p>)}</details> : "—"}</td></tr>; })}</tbody></table></div>;
}

function ResultStep({ backTo, result, processed, omitted, failedItems, onDownloadErrors, onReset }: {
  backTo: string; result: ImportCommitResult; processed: number; omitted: number;
  failedItems: NonNullable<ImportCommitResult["items"]>; onDownloadErrors: () => void; onReset: () => void;
}) {
  return <section className="import-wizard-card import-result-card"><div className="import-result-heading"><span><CheckCircle2 /></span><div><h2>Importación finalizada</h2><p>{result.message || "El archivo fue procesado correctamente."}</p></div></div><div className="import-result-metrics"><article><span>Procesados</span><strong>{processed}</strong></article><article className="success"><span>Importados</span><strong>{result.created ?? 0}</strong></article><article><span>Omitidos</span><strong>{omitted}</strong></article><article className="danger"><span>Con errores</span><strong>{result.failed ?? failedItems.length}</strong></article></div>{failedItems.length > 0 && <div className="import-failed-records"><header><div><h3>Registros no importados</h3><p>Corrige estos registros antes de volver a intentarlo.</p></div><button onClick={onDownloadErrors}><Download /> Descargar errores</button></header>{failedItems.map((item) => <div key={item.rowNumber}><XCircle /><strong>Fila {item.rowNumber}</strong><span>{item.message}</span></div>)}</div>}<footer className="import-wizard-actions"><Link to={backTo}>Ir al listado</Link><button className="action-primary" onClick={onReset}>Nueva importación</button></footer></section>;
}

const statusLabel = (status: StatusFilter) => ({ all: "Todos", valid: "Válido", warning: "Advertencia", invalid: "Error" })[status];
const statusCount = (preview: ImportPreview, status: Exclude<StatusFilter, "all">) => ({ valid: preview.validRows, warning: preview.warningRows, invalid: preview.invalidRows })[status];
