import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { productImportsApi, unitImportsApi } from "./catalogApi";

describe("importadores de catálogo", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => api.reset());

  it.each([
    ["productos", "/api/products", productImportsApi],
    ["unidades", "/api/units", unitImportsApi],
  ] as const)("usa los endpoints de %s", async (_, path, importer) => {
    api.onGet(`${path}/imports/template`).reply(200, new Blob());
    api.onPost(`${path}/imports/validate`).reply(200, {
      importId: "import-1",
      expiresAtUtc: "2026-09-19T00:00:00Z",
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      invalidRows: 0,
      rows: [],
    });
    api.onPost(`${path}/imports/import-1/commit`).reply(200, {
      created: 1,
      failed: 0,
      items: [],
    });

    await importer.template();
    await importer.validate([{ rowNumber: 2, name: "Registro" }]);
    await importer.commit("import-1", {
      includeAllValidRows: false,
      includeWarningRows: false,
      selectedRows: [2],
    });

    expect(api.history.get[0].url).toBe(`${path}/imports/template`);
    expect(JSON.parse(api.history.post[0].data)).toEqual({
      rows: [{ rowNumber: 2, name: "Registro" }],
    });
    expect(JSON.parse(api.history.post[1].data).selectedRows).toEqual([2]);
  });
});
