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

  it("consulta empresas y la capacidad de usuarios", async () => {
    const api = new MockAdapter(apiClient);
    api.onGet("/api/companies").reply(200, {
      items: [{ externalId: "cmp_1", name: "Urban", status: "active" }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    api.onGet("/api/companies/current/user-capacity").reply(200, {
      companyExternalId: "cmp_1",
      userLimit: 10,
      activeUserCount: 7,
      pendingInvitationCount: 1,
      usedSlots: 8,
      availableSlots: 2,
    });

    const result = await companyApi.list({
      search: "Urban",
      status: "active",
      page: 1,
      pageSize: 20,
    });
    expect(result.items[0].externalId).toBe("cmp_1");
    expect(api.history.get[0].params).toEqual({
      search: "Urban",
      status: "active",
      page: 1,
      pageSize: 20,
    });
    expect((await companyApi.userCapacity()).availableSlots).toBe(2);
    api.restore();
  });

  it("actualiza el límite de usuarios", async () => {
    const api = new MockAdapter(apiClient);
    api.onPatch("/api/companies/cmp_1/user-limit").reply(200, {
      companyExternalId: "cmp_1",
      userLimit: 15,
      activeUserCount: 7,
      pendingInvitationCount: 1,
      usedSlots: 8,
      availableSlots: 7,
    });

    expect((await companyApi.updateUserLimit("cmp_1", 15)).userLimit).toBe(15);
    expect(JSON.parse(api.history.patch[0].data)).toEqual({ userLimit: 15 });
    api.restore();
  });
});
