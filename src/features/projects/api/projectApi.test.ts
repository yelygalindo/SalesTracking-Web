import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { projectApi } from "./projectApi";

describe("projectApi.setCover", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => {
    api.reset();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("usa los identificadores externos en la ruta de portada", async () => {
    api
      .onPut("/api/projects/project-1/attachments/attachment-2/cover")
      .reply(200, { message: "Portada actualizada." });

    await projectApi.setCover("project-1", "attachment-2");

    expect(JSON.parse(api.history.put[0].data)).toEqual({
      clientRequestId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("envía solamente los filtros soportados al listar proyectos", async () => {
    api.onGet("/api/projects").reply(200, {
      items: [],
      pagination: { page: 2, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    await projectApi.list({
      status: "Active",
      sellerId: "seller-1",
      page: 2,
      pageSize: 20,
    });
    expect(api.history.get[0].params).toEqual({
      status: "Active",
      sellerId: "seller-1",
      page: 2,
      pageSize: 20,
    });
  });
});
