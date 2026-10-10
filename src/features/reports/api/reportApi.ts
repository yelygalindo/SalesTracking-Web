import { apiClient } from "@/lib/api/apiClient";
import { AppError } from "@/lib/api/apiError";

export type ReportType = "customers" | "deliveries" | "commercial-activity";

export interface ReportFilters {
  from?: string;
  to?: string;
  sellerId?: string;
  status?: string;
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

const endpoints: Record<ReportType, string> = {
  customers: "customers-pending-contact",
  deliveries: "deliveries",
  "commercial-activity": "commercial-activity",
};

const paramsFor = (type: ReportType, filters: ReportFilters) => ({
  from: filters.from,
  to: filters.to,
  sellerExternalId: filters.sellerId,
  statusId:
    type !== "commercial-activity" &&
    filters.status &&
    /^\d+$/.test(filters.status)
      ? Number(filters.status)
      : undefined,
  page: 1,
  pageSize: 100,
});

const getReport = async (type: ReportType, filters: ReportFilters) =>
  (
    await apiClient.get<ReportPage>(`/api/reports/${endpoints[type]}`, {
      params: paramsFor(type, filters),
    })
  ).data;

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
        { params: paramsFor("deliveries", filters) },
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
