import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { reminderApi } from "./reminderApi";

describe("reminderApi", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => api.reset());

  it("envía el rango mensual, el estado y el responsable seleccionado", async () => {
    api.onGet("/api/reminders").reply(200, []);

    await reminderApi.list({
      from: "2026-09-28",
      to: "2026-11-01",
      completed: false,
      sellerExternalId: "seller-1",
    });

    expect(api.history.get[0].params).toEqual({
      from: "2026-09-28",
      to: "2026-11-01",
      completed: false,
      sellerExternalId: "seller-1",
    });
  });
});
