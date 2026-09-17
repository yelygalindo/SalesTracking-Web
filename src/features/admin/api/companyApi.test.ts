import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { companyApi } from "./companyApi";

describe("companyApi", () => {
  it("consulta y actualiza la zona horaria de la empresa", async () => {
    const api = new MockAdapter(apiClient);
    api.onGet("/api/companies/current/time-zone").reply(200, {
      timeZoneId: "America/La_Paz",
    });
    api.onPut("/api/companies/current/time-zone").reply(200, {
      timeZoneId: "America/Lima",
    });

    expect((await companyApi.timeZone()).timeZoneId).toBe("America/La_Paz");
    expect((await companyApi.updateTimeZone("America/Lima")).timeZoneId).toBe(
      "America/Lima",
    );
    expect(JSON.parse(api.history.put[0].data)).toEqual({
      timeZoneId: "America/Lima",
    });
    api.restore();
  });
});
