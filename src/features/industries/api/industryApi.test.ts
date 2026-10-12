import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { publicApiClient } from "@/lib/api/apiClient";
import { industryApi } from "./industryApi";

describe("industryApi", () => {
  it("consulta el catálogo de rubros sin sesión", async () => {
    const api = new MockAdapter(publicApiClient);
    api.onGet("/api/industries").reply(200, [{ code: "construction", name: "Construcción" }]);

    expect(await industryApi.list()).toEqual([{ code: "construction", name: "Construcción" }]);
    api.restore();
  });
});
