import { describe, expect, it } from "vitest";
import {
  emptyTrialSignup,
  invalidTrialSignupFields,
  trialSignupValidators,
  validateNewPassword,
  validatePasswordConfirmation,
} from "./trialSignupValidation";

describe("trialSignupValidation", () => {
  it("exige todos los datos del registro", () => {
    expect(invalidTrialSignupFields(emptyTrialSignup)).toEqual([
      "fullName",
      "email",
      "phone",
      "city",
      "country",
      "companyName",
      "industry",
    ]);
    expect(
      invalidTrialSignupFields({
        fullName: "Ana Pérez",
        email: "ana@empresa.com",
        phone: "+591 700-00000",
        city: "La Paz",
        country: "Bolivia",
        companyName: "Constructora Andina",
        industry: "Construcción",
      }),
    ).toEqual([]);
  });

  it("valida el teléfono con la misma regla que la API", () => {
    expect(trialSignupValidators.phone("591 (2) 2400000")).toBeNull();
    expect(trialSignupValidators.phone("(591) 70000000")).not.toBeNull();
    expect(trialSignupValidators.phone("123")).not.toBeNull();
    expect(trialSignupValidators.phone("abc12345")).not.toBeNull();
  });

  it("aplica la política de contraseñas", () => {
    expect(validateNewPassword("Corta1")).toMatch(/8 caracteres/);
    expect(validateNewPassword("sinmayuscula1")).toMatch(/mayúscula/);
    expect(validateNewPassword("SINMINUSCULA1")).toMatch(/minúscula/);
    expect(validateNewPassword("SinNumeros")).toMatch(/número/);
    expect(validateNewPassword("Ñandú2026")).toBeNull();
    expect(validatePasswordConfirmation("Clave123", "Clave124")).toBe("Las contraseñas no coinciden.");
    expect(validatePasswordConfirmation("Clave123", "Clave123")).toBeNull();
  });
});
