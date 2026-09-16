import { apiClient } from "@/lib/api/apiClient";
import { AppError } from "@/lib/api/apiError";

export type ReportType =
  "customers" | "deliveries" | "productivity" | "commercial-activity";

export interface ReportFilters {
  from?: string;
  to?: string;
  sellerId?: string;
  status?: string;
  zoneId?: string;
}

export interface ReportRow {
  [key: string]: unknown;
  externalId?: string;
  customerExternalId?: string;
  customerName?: string;
  projectExternalId?: string;
  projectName?: string;
  deliveryExternalId?: string;
  sellerName?: string;
  status?: string;
  statusName?: string;
  statusId?: number;
  zoneName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  productName?: string;
  title?: string;
  eventTypeName?: string;
  description?: string;
  committedDateUtc?: string;
  occurredAtUtc?: string;
  createdAtUtc?: string;
  lastContactAtUtc?: string;
  nextContactAtUtc?: string;
  reminderAtUtc?: string;
  text?: string;
  name?: string;
  progressPercentage?: number;
  expectedCloseDateUtc?: string;
  totalQuantity?: number;
  deliveredQuantity?: number;
  completedCount?: number;
  pendingCount?: number;
  totalCount?: number;
}

export interface ReportPage {
  items: ReportRow[];
  summary?: Record<string, string | number | null>;
  chart?: unknown;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

const supportedFilters: Record<ReportType, Array<keyof ReportFilters>> = {
  customers: ["sellerId", "status", "zoneId"],
  deliveries: ["from", "to", "sellerId", "status", "zoneId"],
  productivity: ["from", "to", "sellerId", "zoneId"],
  "commercial-activity": ["from", "to", "sellerId", "zoneId"],
};

function paramsFor(type: ReportType, filters: ReportFilters) {
  return Object.fromEntries(
    supportedFilters[type]
      .filter((key) => filters[key] !== undefined && filters[key] !== "")
      .map((key) => [key, filters[key]]),
  );
}

const legacyType: Partial<Record<ReportType, string>> = {
  customers: "customers-pending-contact",
};

const legacyParams = (filters: ReportFilters) => ({
  from: filters.from,
  to: filters.to,
  sellerExternalId: filters.sellerId,
  statusId:
    filters.status && /^\d+$/.test(filters.status)
      ? Number(filters.status)
      : undefined,
  page: 1,
  pageSize: 100,
});

async function getReport(type: ReportType, filters: ReportFilters) {
  try {
    return (
      await apiClient.get<ReportPage>(`/api/reports/${type}`, {
        params: paramsFor(type, filters),
      })
    ).data;
  } catch (error) {
    const fallback = legacyType[type];
    if (
      error instanceof AppError &&
      error.code === "notFound" &&
      type === "productivity"
    )
      throw new AppError(
        "notFound",
        "El reporte de productividad todavía no está disponible en la API.",
        404,
      );
    if (!(error instanceof AppError) || error.code !== "notFound" || !fallback)
      throw error;
    return (
      await apiClient.get<ReportPage>(`/api/reports/${fallback}`, {
        params: legacyParams(filters),
      })
    ).data;
  }
}

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;
const deliveryCsv = (rows: ReportRow[]) => {
  const header = [
    "Entrega",
    "Proyecto",
    "Cliente",
    "Vendedor",
    "Estado",
    "Fecha comprometida",
    "Cantidad total",
    "Cantidad entregada",
  ];
  const body = rows.map((row) => [
    row.deliveryExternalId,
    row.projectName,
    row.customerName,
    row.sellerName,
    row.statusName,
    row.committedDateUtc,
    row.totalQuantity,
    row.deliveredQuantity,
  ]);
  return `\uFEFF${[header, ...body].map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
};

export const reportApi = {
  get: getReport,

  exportDeliveries: async (filters: ReportFilters) => {
    try {
      const response = await apiClient.get<Blob>(
        "/api/reports/deliveries/export",
        {
          params: paramsFor("deliveries", filters),
          responseType: "blob",
        },
      );
      const disposition = String(response.headers["content-disposition"] ?? "");
      const fileName = disposition.match(
        /filename\*?=(?:UTF-8''|["']?)([^"';]+)/i,
      )?.[1];
      return {
        blob: response.data,
        fileName: fileName
          ? decodeURIComponent(fileName)
          : "reporte-entregas.xlsx",
      };
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "notFound")
        throw error;
      const report = await apiClient.get<ReportPage>(
        "/api/reports/deliveries",
        { params: legacyParams(filters) },
      );
      return {
        blob: new Blob([deliveryCsv(report.data.items)], {
          type: "text/csv;charset=utf-8",
        }),
        fileName: "reporte-entregas.csv",
      };
    }
  },
};
