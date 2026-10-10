import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { projectService } from "./projectService";

describe("projectService.listOptions", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => api.reset());

  it("carga todas las páginas disponibles para el selector de entregas", async () => {
    api.onGet("/api/projects").reply((request) => {
      const page = request.params.page as number;
      return [
        200,
        {
          items: [{ externalId: `project-${page}`, name: `Proyecto ${page}` }],
          pagination: {
            page,
            pageSize: 100,
            totalItems: 2,
            totalPages: 2,
          },
        },
      ];
    });

    const projects = await projectService.listOptions();

    expect(projects.map((project) => project.externalId)).toEqual([
      "project-1",
      "project-2",
    ]);
    expect(api.history.get.map((request) => request.params)).toEqual([
      { page: 1, pageSize: 100 },
      { page: 2, pageSize: 100 },
    ]);
  });
});
