import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { reportApi } from "./reportApi";

describe("reportApi", () => {
  const api = new MockAdapter(apiClient);
  beforeEach(() => api.reset());

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
