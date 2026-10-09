import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { operationsApi } from "./operationsApi";

describe("operationsApi.locations", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => api.reset());

  it("conserva los segmentos independientes del contrato actual", async () => {
    api.onGet("/api/workdays/workday-1/locations").reply(200, {
      routePoints: [],
      segments: [
        {
          type: "LineString",
          coordinates: [
            [-66.157, -17.3935],
            [-66.1568, -17.3937],
          ],
        },
      ],
      mapMatched: true,
    });

    const result = await operationsApi.locations("workday-1");

    expect(result.segments).toHaveLength(1);
    expect(result.mapMatched).toBe(true);
  });

  it("normaliza el contrato anterior sin intentar construir una polilínea", async () => {
    const point = {
      capturedAtUtc: "2026-10-09T12:00:00Z",
      latitude: -17.3935,
      longitude: -66.157,
    };
    api.onGet("/api/workdays/workday-2/locations").reply(200, [point]);

    const result = await operationsApi.locations("workday-2");

    expect(result).toEqual({
      routePoints: [point],
      segments: [],
      mapMatched: false,
    });
  });

  it("usa arreglos vacíos cuando faltan propiedades opcionales", async () => {
    api.onGet("/api/workdays/workday-3/locations").reply(200, {
      mapMatched: false,
    });

    await expect(operationsApi.locations("workday-3")).resolves.toEqual({
      routePoints: [],
      segments: [],
      mapMatched: false,
    });
  });
});
