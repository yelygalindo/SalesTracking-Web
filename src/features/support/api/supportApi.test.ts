import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { supportApi } from "./supportApi";

describe("supportApi", () => {
  const api = new MockAdapter(apiClient);
  beforeEach(() => api.reset());

  it("envía la consulta con el contrato de la API", async () => {
    api
      .onPost("/api/support/requests")
      .reply(202, { reference: "SOP-1", message: "Recibimos tu consulta." });

    const result = await supportApi.create({
      category: "account",
      subject: " No puedo entrar ",
      message: " Me pide la contraseña otra vez. ",
      includeTechnicalData: true,
      context: { page: "/customers", browser: "Chrome 141 en Windows" },
      clientRequestId: "00000000-0000-4000-8000-000000000003",
    });

    expect(result.reference).toBe("SOP-1");
    expect(JSON.parse(api.history.post[0].data)).toEqual({
      category: "account",
      subject: "No puedo entrar",
      message: "Me pide la contraseña otra vez.",
      includeTechnicalData: true,
      context: { page: "/customers", browser: "Chrome 141 en Windows" },
      clientRequestId: "00000000-0000-4000-8000-000000000003",
    });
  });

  it("no envía datos técnicos si el usuario los desactivó", async () => {
    api.onPost("/api/support/requests").reply(202, { reference: "SOP-2", message: "" });

    await supportApi.create({
      category: "usage",
      subject: "Duda",
      message: "¿Cómo exporto?",
      includeTechnicalData: false,
      context: { page: "/projects", browser: "Firefox" },
      clientRequestId: "00000000-0000-4000-8000-000000000004",
    });

    expect(JSON.parse(api.history.post[0].data).context).toBeUndefined();
  });
});
