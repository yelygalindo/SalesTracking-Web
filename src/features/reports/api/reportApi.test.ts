import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { reportApi } from "./reportApi";

describe("reportApi", () => {
  const api = new MockAdapter(apiClient);
  beforeEach(() => api.reset());

  it("envía filtros con el contrato de la API en el reporte de clientes", async () => {
    api.onGet("/api/reports/customers-pending-contact").reply(200, {
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    });

    await reportApi.get("customers", {
      sellerId: "seller-1",
      status: "3",
    });

    expect(api.history.get[0].url).toBe(
      "/api/reports/customers-pending-contact",
    );
    expect(api.history.get[0].params).toEqual({
      from: undefined,
      to: undefined,
      sellerExternalId: "seller-1",
      statusId: 3,
      page: 1,
      pageSize: 100,
    });
  });

  it("usa la ruta publicada y los filtros de productividad", async () => {
    api.onGet("/api/reports/seller-productivity").reply(200, {
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    });

    await reportApi.get("productivity", {
      from: "2026-01-01",
      to: "2026-01-31",
      sellerId: "seller-2",
    });

    expect(api.history.get[0].url).toBe("/api/reports/seller-productivity");
    expect(api.history.get[0].params).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
      sellerExternalId: "seller-2",
      statusId: undefined,
      page: 1,
      pageSize: 100,
    });
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
      status: "2",
    });

    expect(api.history.get[0].params).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
      sellerExternalId: undefined,
      statusId: 2,
      page: 1,
      pageSize: 100,
    });
    expect(result.fileName).toBe("entregas.xlsx");
  });
});
