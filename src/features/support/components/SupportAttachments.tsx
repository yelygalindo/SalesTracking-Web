import { useRef, useState, type DragEvent } from "react";
import { FileText, Image, Paperclip, X } from "lucide-react";
import {
  addSupportFiles,
  formatFileSize,
  supportAttachmentRules,
} from "../services/supportAttachments";

/** Picker for screenshots or documents that go with a support request. */
export function SupportAttachments({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const full = files.length >= supportAttachmentRules.maxFiles;

  const add = (selected: FileList | null) => {
    if (!selected?.length) return;
    const result = addSupportFiles(files, [...selected]);
    setProblems(result.rejected);
    onChange(result.files);
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) add(event.dataTransfer.files);
  };

  return (
    <div className="support-attachments">
      <span className="support-attachments-label">Adjuntos (opcional)</span>
      <div
        className={`support-dropzone${dragging ? " dragging" : ""}${full ? " full" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!full && !disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <Paperclip aria-hidden="true" />
        <p>
          {full ? (
            "Llegaste al máximo de archivos."
          ) : (
            <>
              Arrastra capturas aquí o{" "}
              <button
                type="button"
                disabled={disabled}
                onClick={() => input.current?.click()}
              >
                elige archivos
              </button>
            </>
          )}
          <small>
            Hasta {supportAttachmentRules.maxFiles} archivos de{" "}
            {formatFileSize(supportAttachmentRules.maxBytes)} · imágenes o PDF
          </small>
        </p>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept={supportAttachmentRules.accept}
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {problems.length > 0 && (
        <ul className="support-attachment-problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="support-attachment-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              {file.type.startsWith("image/") ? (
                <Image aria-hidden="true" />
              ) : (
                <FileText aria-hidden="true" />
              )}
              <span title={file.name}>{file.name}</span>
              <small>{formatFileSize(file.size)}</small>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Quitar ${file.name}`}
                onClick={() => {
                  setProblems([]);
                  onChange(files.filter((_, position) => position !== index));
                }}
              >
                <X />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
