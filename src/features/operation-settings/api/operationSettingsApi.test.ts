import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { operationSettingsApi } from "./operationSettingsApi";

const construction = {
  industryCode: "construction",
  industryName: "Construcción",
  source: "industry",
  labels: {
    customer: { singular: "Cliente", plural: "Clientes" },
    project: { singular: "Obra", plural: "Obras" },
    visit: { singular: "Visita a obra", plural: "Visitas a obra" },
  },
  modules: { deliveries: true, catalog: true },
};

describe("operationSettingsApi", () => {
  it("consulta la configuración de la operación", async () => {
    const api = new MockAdapter(apiClient);
    api.onGet("/api/companies/current/operation-settings").reply(200, construction);

    expect((await operationSettingsApi.current()).labels.project.plural).toBe("Obras");
    api.restore();
  });

  it("personaliza, restablece y cambia el rubro", async () => {
    const api = new MockAdapter(apiClient);
    api
      .onPut("/api/companies/current/operation-settings")
      .reply(200, { ...construction, source: "custom" });
    api.onDelete("/api/companies/current/operation-settings").reply(200, construction);
    api.onPut("/api/companies/current/industry").reply(200, construction);

    const input = {
      customerLabelSingular: "Cliente",
      customerLabelPlural: "Clientes",
      projectLabelSingular: "Obra",
      projectLabelPlural: "Obras",
      visitLabelSingular: "Visita",
      visitLabelPlural: "Visitas",
      deliveriesEnabled: false,
      catalogEnabled: true,
    };
    expect((await operationSettingsApi.customize(input)).source).toBe("custom");
    expect(JSON.parse(api.history.put[0].data)).toEqual(input);
    expect((await operationSettingsApi.reset()).source).toBe("industry");
    await operationSettingsApi.changeIndustry("construction");
    expect(JSON.parse(api.history.put[1].data)).toEqual({ industryCode: "construction" });
    api.restore();
  });
});
