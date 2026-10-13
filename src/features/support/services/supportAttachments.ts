/** Limits agreed with POST /api/support/requests/{reference}/attachments. */
export const supportAttachmentRules = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  accept: ".png,.jpg,.jpeg,.webp,.pdf",
} as const;

export const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(".0", "")} MB`;

/** Adds the files that fit the rules and explains why the rest were left out. */
export function addSupportFiles(current: File[], selected: File[]) {
  const { maxFiles, maxBytes, types } = supportAttachmentRules;
  const files = [...current];
  const rejected: string[] = [];
  for (const file of selected) {
    if (!(types as readonly string[]).includes(file.type))
      rejected.push(`${file.name}: solo se aceptan imágenes (PNG, JPG, WebP) o PDF.`);
    else if (file.size > maxBytes)
      rejected.push(`${file.name}: supera el máximo de ${formatFileSize(maxBytes)}.`);
    else if (files.some((item) => item.name === file.name && item.size === file.size))
      continue;
    else if (files.length >= maxFiles)
      rejected.push(`${file.name}: puedes adjuntar hasta ${maxFiles} archivos.`);
    else files.push(file);
  }
  return { files, rejected };
}
