import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { reportApi } from "./reportApi";

describe("reportApi analítico", () => {
  const api = new MockAdapter(apiClient);
  beforeEach(() => api.reset());

  it("lee todas las páginas de productividad con los filtros de la API", async () => {
    api.onGet("/api/reports/seller-productivity").reply((config) => [
      200,
      {
        items: [{ sellerExternalId: `seller-${config.params.page}` }],
        pagination: { page: config.params.page, pageSize: 100, totalItems: 2, totalPages: 2 },
      },
    ]);

    const rows = await reportApi.sellerProductivity({
      from: "2026-10-01",
      to: "2026-10-13",
      sellerId: "",
    });

    expect(rows.map((row) => row.sellerExternalId)).toEqual(["seller-1", "seller-2"]);
    expect(api.history.get[0].params).toEqual({
      from: "2026-10-01",
      to: "2026-10-13",
      sellerExternalId: undefined,
      page: 1,
      pageSize: 100,
    });
  });

  it("filtra el reporte de proyectos por responsable", async () => {
    api.onGet("/api/reports/projects").reply(200, {
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    });

    await reportApi.projects({ sellerId: "seller-1" });

    expect(api.history.get[0].params).toEqual({
      sellerExternalId: "seller-1",
      page: 1,
      pageSize: 100,
    });
  });
});
