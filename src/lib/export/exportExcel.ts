const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function exportExcel<T>(
  fileName: string,
  columns: Array<{ label: string; value: (row: T) => unknown }>,
  rows: T[],
) {
  const tableRows = [
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => column.value(row))),
  ];
  const csv = tableRows
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
