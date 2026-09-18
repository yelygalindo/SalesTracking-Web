import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { CellValue } from "read-excel-file/browser";
import { Download, FileCheck2, Upload, X } from "lucide-react";
import { notify } from "@/components/feedback/toast";
import { downloadBlob } from "@/lib/export/downloadBlob";
import type {
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ImportPreviewRow,
  SpreadsheetRow,
} from "@/types/spreadsheetImport";

type Field = {
  key: string;
  label: string;
  transform?: (value: CellValue | null) => unknown;
};

type Props = {
  entityLabel: string;
  templateName: string;
  fields: Field[];
  downloadTemplate: () => Promise<Blob>;
  validateRows: (rows: SpreadsheetRow[]) => Promise<ImportPreview>;
  commit: (importId: string, request: ImportCommitRequest) => Promise<ImportCommitResult>;
  onCommitted: () => Promise<unknown>;
};

const maxRows = 1000;
const normalizeHeader = (value: CellValue | null) => String(value ?? "").trim().toLowerCase();
const issueText = (value: string | { message: string }) =>
  typeof value === "string" ? value : value.message;

export function SpreadsheetImportDialog(props: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeAllValidRows, setIncludeAllValidRows] = useState(true);
  const [includeWarningRows, setIncludeWarningRows] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const template = useMutation({
    mutationFn: props.downloadTemplate,
    onSuccess: (blob) => downloadBlob(blob, props.templateName),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const validate = useMutation({
    mutationFn: props.validateRows,
    onSuccess: (result) => {
      setPreview(result);
      setSelectedRows([]);
      notify("Archivo validado. Revisa la previsualización antes de confirmar.");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const confirm = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error("Primero debes validar un archivo.");
      return props.commit(preview.importId, {
        includeAllValidRows,
        includeWarningRows,
        selectedRows: includeAllValidRows ? [] : selectedRows,
      });
    },
    onSuccess: async (result) => {
      notify(result.message || `${result.created ?? 0} registros importados correctamente.`);
      setOpen(false);
      setPreview(null);
      await props.onCommitted();
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const readFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      notify("Selecciona un archivo XLSX.", "error");
      return;
    }
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const sheet = await readSheet(file);
      if (sheet.length < 2) throw new Error("La plantilla no contiene filas para importar.");
      const headers = sheet[0].map(normalizeHeader);
      const indexes = props.fields.map((field) => headers.indexOf(field.key.toLowerCase()));
      const missing = props.fields.filter((_, index) => indexes[index] < 0);
      if (missing.length) throw new Error(`Faltan columnas: ${missing.map((field) => field.label).join(", ")}.`);
      const dataRows = sheet
        .slice(1)
        .map((cells, index) => ({ cells, rowNumber: index + 2 }))
        .filter(({ cells }) => cells.some((cell) => cell !== null && cell !== ""));
      if (!dataRows.length) throw new Error("La plantilla no contiene filas para importar.");
      if (dataRows.length > maxRows) throw new Error(`El archivo no puede superar ${maxRows} filas.`);
      const rows = dataRows.map(({ cells, rowNumber }) => {
        const row: SpreadsheetRow = { rowNumber };
        props.fields.forEach((field, fieldIndex) => {
          const value = cells[indexes[fieldIndex]] ?? null;
          row[field.key] = field.transform ? field.transform(value) : value;
        });
        return row;
      });
      validate.mutate(rows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No fue posible leer el archivo.", "error");
    }
  };

  const selectable = preview?.rows.filter((row) => row.status !== "invalid") ?? [];
  const invalid = preview?.rows.filter((row) => row.status === "invalid") ?? [];
  const toggleRow = (rowNumber: number) =>
    setSelectedRows((current) =>
      current.includes(rowNumber)
        ? current.filter((value) => value !== rowNumber)
        : [...current, rowNumber],
    );

  return (
    <>
      <button className="excel-export-button" onClick={() => setOpen(true)}>
        <Upload /> Importar XLSX
      </button>
      {open && (
        <div className="upload-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <aside className="upload-drawer spreadsheet-import-drawer" role="dialog" aria-modal="true" aria-labelledby="spreadsheet-import-title">
            <button className="panel-close" aria-label="Cerrar" onClick={() => setOpen(false)}><X /></button>
            <p className="overline">Importación masiva</p>
            <h2 id="spreadsheet-import-title">Importar {props.entityLabel}</h2>
            <p>Descarga la plantilla, completa hasta {maxRows} filas y valida el archivo antes de confirmar.</p>
            <div className="spreadsheet-import-actions">
              <button disabled={template.isPending} onClick={() => template.mutate()}><Download /> Descargar plantilla</button>
              <input ref={input} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
              <button className="action-primary" disabled={validate.isPending} onClick={() => input.current?.click()}><FileCheck2 /> {validate.isPending ? "Validando…" : "Seleccionar y validar"}</button>
            </div>
            {preview && (
              <>
                <div className="import-preview-summary">
                  <span><strong>{preview.validRows}</strong> válidas</span>
                  <span><strong>{preview.warningRows}</strong> con advertencias</span>
                  <span><strong>{preview.invalidRows}</strong> inválidas</span>
                </div>
                <div className="import-selection-options">
                  <label><input type="checkbox" checked={includeAllValidRows} onChange={(event) => setIncludeAllValidRows(event.target.checked)} /> Importar todas las filas válidas</label>
                  <label><input type="checkbox" checked={includeWarningRows} onChange={(event) => setIncludeWarningRows(event.target.checked)} /> Incluir filas con advertencias</label>
                </div>
                {!includeAllValidRows && (
                  <div className="import-row-list">
                    {selectable.map((row) => <ImportRow key={row.rowNumber} row={row} selected={selectedRows.includes(row.rowNumber)} onToggle={() => toggleRow(row.rowNumber)} />)}
                  </div>
                )}
                {invalid.length > 0 && (
                  <div className="import-invalid-list">
                    <strong>Filas que no se importarán</strong>
                    {invalid.map((row) => <ImportRow key={row.rowNumber} row={row} />)}
                  </div>
                )}
                <button className="action-primary import-confirm" disabled={confirm.isPending || (!includeAllValidRows && selectedRows.length === 0)} onClick={() => confirm.mutate()}>
                  {confirm.isPending ? "Importando…" : "Confirmar importación"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function ImportRow({ row, selected, onToggle }: { row: ImportPreviewRow; selected?: boolean; onToggle?: () => void }) {
  const issues = [...(row.errors ?? []), ...(row.warnings ?? []), ...(row.messages ?? [])];
  return (
    <label className="import-row">
      {onToggle && <input type="checkbox" checked={selected} onChange={onToggle} />}
      <span><strong>Fila {row.rowNumber}</strong>{issues.length ? issues.map(issueText).join(" · ") : "Lista para importar"}</span>
    </label>
  );
}
