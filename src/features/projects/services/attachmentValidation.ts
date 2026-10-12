import type { Attachment, AttachmentOptions } from "../api/projectDtos";

export type AttachmentKind = "Photo" | "Document";

const extensionOf = (fileName: string) =>
  `.${fileName.split(".").pop()?.toLowerCase() ?? ""}`;

const formatFor = (fileName: string, options: AttachmentOptions) => {
  const extension = extensionOf(fileName);
  return options.acceptedFormats.find((item) =>
    item.extensions.some((value) => value.toLowerCase() === extension),
  );
};

// Some systems (e.g. Windows with no Office installed) report .doc/.xls files with no MIME.
const unknownType = (type: string) =>
  !type || type === "application/octet-stream";

export function validateAttachment(
  file: File | null,
  options?: AttachmentOptions,
): string | null {
  if (!file) return "Selecciona un archivo.";
  if (!options) return "No se pudieron consultar las reglas de archivos.";
  if (file.size > options.maxFileSizeBytes)
    return `El archivo supera el máximo de ${formatBytes(options.maxFileSizeBytes)}.`;
  const format = formatFor(file.name, options);
  if (!format)
    return `Formato no permitido. Usa ${options.acceptedFormats.flatMap((item) => item.extensions).join(", ")}.`;
  if (
    !unknownType(file.type) &&
    !format.contentTypes.some(
      (value) => value.toLowerCase() === file.type.toLowerCase(),
    )
  )
    return "El tipo de contenido del archivo no coincide con su extensión.";
  return null;
}

/** The API only accepts images as "Photo" and PDF/Excel/Word as "Document". */
export function attachmentKindFor(
  fileName: string,
  options?: AttachmentOptions,
): AttachmentKind | null {
  const format = options && formatFor(fileName, options);
  if (!format) return null;
  return format.contentTypes.every((type) => type.startsWith("image/"))
    ? "Photo"
    : "Document";
}

/** MIME to send: the browser's when valid, otherwise the one expected for the extension. */
export function contentTypeFor(file: File, options?: AttachmentOptions) {
  const format = options && formatFor(file.name, options);
  if (!format) return file.type;
  const matches = format.contentTypes.some(
    (value) => value.toLowerCase() === file.type.toLowerCase(),
  );
  return matches ? file.type : format.contentTypes[0];
}

export const isPhoto = (attachment: Pick<Attachment, "attachmentType" | "contentType">) =>
  attachment.attachmentType
    ? attachment.attachmentType.toLowerCase() === "photo"
    : attachment.contentType.startsWith("image/");

/** Short label shown on document cards. */
export function documentFormat(attachment: Pick<Attachment, "fileName" | "contentType">) {
  const extension = extensionOf(attachment.fileName);
  const type = attachment.contentType.toLowerCase();
  if (extension === ".pdf" || type.includes("pdf")) return "PDF";
  if ([".xls", ".xlsx"].includes(extension) || type.includes("sheet") || type.includes("excel"))
    return "Excel";
  if ([".doc", ".docx"].includes(extension) || type.includes("word")) return "Word";
  return "Archivo";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
