import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { customerService } from "../services/customerService";
import type { CustomerImportResult } from "../api/customerApi";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { notify } from "@/components/feedback/toast";

const maxCsvSize = 5 * 1024 * 1024;

export function CustomerCsvActions({
  canImport,
  canExport,
  onImported,
}: {
  canImport: boolean;
  canExport: boolean;
  onImported: () => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const exporter = useMutation({
    mutationFn: customerService.exportCsv,
    onSuccess: (blob) =>
      downloadBlob(
        blob,
        `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
      ),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const importer = useMutation({
    mutationFn: customerService.importCsv,
    onSuccess: async (value) => {
      setResult(value);
      notify(
        `Importación terminada: ${value.imported} exitosas y ${value.failed} con error.`,
        value.failed ? "error" : undefined,
      );
      await onImported();
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const select = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      notify("Selecciona un archivo CSV.", "error");
      return;
    }
    if (file.size > maxCsvSize) {
      notify("El CSV no puede superar 5 MB.", "error");
      return;
    }
    importer.mutate(file);
  };
  return (
    <>
      {canImport && (
        <>
          <input
            ref={input}
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            className="excel-export-button"
            disabled={importer.isPending}
            onClick={() => input.current?.click()}
          >
            <Upload />
            {importer.isPending ? "Importando…" : "Importar CSV"}
          </button>
        </>
      )}
      {canExport && (
        <button
          className="excel-export-button"
          disabled={exporter.isPending}
          onClick={() => exporter.mutate()}
        >
          <span className="excel-export-icon">
            <FileSpreadsheet />
          </span>
          {exporter.isPending ? "Exportando…" : "Exportar CSV"}
          <Download />
        </button>
      )}
      {result && (
        <div
          className="upload-drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setResult(null);
          }}
        >
          <aside
            className="upload-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-result-title"
          >
            <button
              className="panel-close"
              onClick={() => setResult(null)}
              aria-label="Cerrar"
            >
              <X />
            </button>
            <p className="overline">Importación CSV</p>
            <h2 id="csv-result-title">Resultado de la importación</h2>
            <div className="capacity-summary">
              <div>
                <strong>{result.imported} filas importadas</strong>
                <span>{result.failed} filas con error</span>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="csv-error-list">
                {result.errors.map((error) => (
                  <p key={`${error.row}-${error.message}`}>
                    <strong>Fila {error.row}</strong>
                    {error.message}
                  </p>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
