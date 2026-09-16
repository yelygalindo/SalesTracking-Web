import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { reportApi } from "./reportApi";

describe("reportApi", () => {
  const api = new MockAdapter(apiClient);
  beforeEach(() => api.reset());

  it("envía solamente filtros soportados por el reporte de clientes", async () => {
    api.onGet("/api/reports/customers").reply(200, {
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    await reportApi.get("customers", {
      from: "2026-01-01",
      to: "2026-01-31",
      sellerId: "seller-1",
      status: "Active",
      zoneId: "zone-1",
    });

    expect(api.history.get[0].params).toEqual({
      sellerId: "seller-1",
      status: "Active",
      zoneId: "zone-1",
    });
  });

  it("usa la ruta compatible de clientes cuando falta el endpoint nuevo", async () => {
    api.onGet("/api/reports/customers").reply(404);
    api.onGet("/api/reports/customers-pending-contact").reply(200, {
      items: [{ customerExternalId: "c-1" }],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    });
    const customers = await reportApi.get("customers", {});

    expect(customers.items[0].customerExternalId).toBe("c-1");
  });

  it("exporta únicamente el reporte de entregas con sus filtros", async () => {
    api
      .onGet("/api/reports/deliveries/export")
      .reply(200, new Blob(["report"]), {
        "content-disposition": 'attachment; filename="entregas.xlsx"',
      });

    const result = await reportApi.exportDeliveries({
      from: "2026-01-01",
      to: "2026-01-31",
      status: "Pending",
    });

    expect(api.history.get[0].params).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
      status: "Pending",
    });
    expect(result.fileName).toBe("entregas.xlsx");
  });
});
