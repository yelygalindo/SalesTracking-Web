import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../services/customerService";

const isCrmStatus = (label: string) =>
  [
    "prospect",
    "prospecto",
    "contacted",
    "contactado",
    "active",
    "activo",
  ].includes(label.trim().toLowerCase());

export interface CustomerDataFilters {
  query: string;
  status: string;
  seller: string;
  page: number;
  canViewTeam: boolean;
  selected: string | null;
}

export function useCustomerData(filters: CustomerDataFilters) {
  const cache = useQueryClient();
  const sellerId =
    filters.canViewTeam && filters.seller ? filters.seller : undefined;
  const list = useQuery({
    queryKey: [
      "customers",
      filters.query,
      filters.status,
      filters.seller,
      filters.page,
    ],
    queryFn: () =>
      customerService.list({
        search: filters.query || undefined,
        status: filters.status || undefined,
        externalUserId: sellerId,
        page: filters.page,
        pageSize: 20,
      }),
  });
  const metrics = useQueries({
    queries: [undefined, "Prospect", "Active"].map((status) => ({
      queryKey: ["customer-metric", status ?? "total", sellerId],
      queryFn: () =>
        customerService.list({
          status,
          externalUserId: sellerId,
          page: 1,
          pageSize: 1,
        }),
    })),
  });
  const statuses = useQuery({
    queryKey: ["customer-statuses"],
    queryFn: customerService.statuses,
  });
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: filters.canViewTeam,
  });
  const detail = useQuery({
    queryKey: ["customer", filters.selected],
    queryFn: () => customerService.detail(filters.selected!),
    enabled: Boolean(filters.selected),
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["customers"] }),
      cache.invalidateQueries({ queryKey: ["customer-metric"] }),
      filters.selected
        ? cache.invalidateQueries({
            queryKey: ["customer", filters.selected],
          })
        : Promise.resolve(),
    ]);
  };
  const fetchDetail = (externalId: string) =>
    cache.fetchQuery({
      queryKey: ["customer", externalId],
      queryFn: () => customerService.detail(externalId),
    });

  return {
    list,
    metrics,
    statuses,
    crmStatuses: (statuses.data ?? []).filter((item) =>
      isCrmStatus(item.label),
    ),
    sellers,
    detail,
    refresh,
    fetchDetail,
  };
}
