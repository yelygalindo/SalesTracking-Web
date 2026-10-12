import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { publicApiClient } from "@/lib/api/apiClient";
import { trialSignupApi } from "./trialSignupApi";

const input = {
  fullName: "Ana Pérez",
  email: "ana@empresa.com",
  phone: "+591 70000000",
  city: "La Paz",
  country: "Bolivia",
  companyName: "Constructora Andina",
  industry: "construction",
  captchaToken: "",
};

describe("trialSignupApi", () => {
  it("registra la solicitud de prueba con el rubro y el captcha", async () => {
    const api = new MockAdapter(publicApiClient);
    api.onPost("/api/trial-signups").reply(202, {
      email: "ana@empresa.com",
      verificationExpiresAtUtc: "2026-10-13T12:00:00Z",
      emailStatus: "Sent",
      message: "Te enviamos un correo.",
    });

    expect((await trialSignupApi.create(input)).emailStatus).toBe("Sent");
    expect(JSON.parse(api.history.post[0].data)).toEqual(input);
    api.restore();
  });

  it("consulta el registro pendiente y lo verifica con la contraseña", async () => {
    const api = new MockAdapter(publicApiClient);
    api.onGet("/api/trial-signups/abc").reply(200, {
      fullName: "Ana Pérez",
      email: "ana@empresa.com",
      companyName: "Constructora Andina",
      expiresAtUtc: "2026-10-13T12:00:00Z",
    });
    api.onPost("/api/trial-signups/verify").reply(201, {
      companyExternalId: "cmp_1",
      companyName: "Constructora Andina",
      email: "ana@empresa.com",
      trialEndsAtUtc: "2026-10-22T12:00:00Z",
      message: "Tu prueba gratuita está activa.",
    });

    expect((await trialSignupApi.pending("abc")).companyName).toBe("Constructora Andina");
    const body = { token: "abc", password: "Clave123", confirmPassword: "Clave123" };
    expect((await trialSignupApi.verify(body)).companyExternalId).toBe("cmp_1");
    expect(JSON.parse(api.history.post[0].data)).toEqual(body);
    api.restore();
  });

  it("devuelve el mensaje del servidor cuando el correo ya está registrado", async () => {
    const api = new MockAdapter(publicApiClient);
    api.onPost("/api/trial-signups").reply(409, { message: "El correo ya está registrado." });

    await expect(trialSignupApi.create(input)).rejects.toMatchObject({
      code: "conflict",
      message: "El correo ya está registrado.",
    });
    api.restore();
  });
});
