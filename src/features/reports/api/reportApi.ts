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

export interface SellerProductivityMetrics {
  workedDays: number;
  activeHours: number;
  visits: number;
  completedVisits: number;
  contactedCustomers: number;
  newCustomers: number;
  completedReminders: number;
  overdueReminders: number;
  averageVisitsPerWorkedDay: number;
  /** Percentage from 0 to 100. */
  reminderComplianceRate: number;
  /** Percentage from 0 to 100. */
  conversionRate: number;
  closedProjects: number;
  closedAmount: number;
}

export interface SellerProductivity {
  sellerExternalId: string;
  sellerName: string;
  current: SellerProductivityMetrics;
  /** Same metrics for the period of equal length right before `from`. */
  previous: SellerProductivityMetrics;
  /** Missing when the previous value was zero. */
  variationPercentage: Partial<Record<keyof SellerProductivityMetrics, number>>;
}

export interface ProjectReportItem {
  projectExternalId: string;
  name: string;
  description?: string | null;
  customerExternalId?: string | null;
  customerName?: string | null;
  sellerExternalId: string;
  sellerName: string;
  statusId: number;
  statusName: string;
  estimatedAmount?: number | null;
  startDateUtc?: string | null;
  expectedCloseDateUtc?: string | null;
  actualCloseDateUtc?: string | null;
  progressPercentage: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

interface Paged<T> {
  items: T[];
  pagination: ReportPage["pagination"];
}

/** The API serves at most 100 rows per page, so analytic views read every page. */
const getAllPages = async <T>(
  path: string,
  params: Record<string, unknown>,
) => {
  const pageSize = 100;
  const read = async (page: number) =>
    (await apiClient.get<Paged<T>>(path, { params: { ...params, page, pageSize } }))
      .data;
  const first = await read(1);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) =>
      read(index + 2),
    ),
  );
  return [first, ...rest].flatMap((page) => page.items);
};

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

  /** `from` and `to` are calendar days (yyyy-mm-dd), both included. */
  sellerProductivity: (filters: { from: string; to: string; sellerId?: string }) =>
    getAllPages<SellerProductivity>("/api/reports/seller-productivity", {
      from: filters.from,
      to: filters.to,
      sellerExternalId: filters.sellerId || undefined,
    }),

  projects: (filters: { sellerId?: string }) =>
    getAllPages<ProjectReportItem>("/api/reports/projects", {
      sellerExternalId: filters.sellerId || undefined,
    }),

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
