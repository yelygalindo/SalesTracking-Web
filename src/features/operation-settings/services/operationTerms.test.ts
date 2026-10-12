import { describe, expect, it } from "vitest";
import {
  defaultOperationTerms,
  inSentence,
  newLabel,
  toOperationTerms,
} from "./operationTerms";

describe("operationTerms", () => {
  it("usa el perfil general cuando no hay configuración", () => {
    expect(toOperationTerms(undefined)).toBe(defaultOperationTerms);
    expect(toOperationTerms(null).labels.project.plural).toBe("Seguimientos");
  });

  it("completa las etiquetas vacías con los valores generales", () => {
    const terms = toOperationTerms({
      industryCode: "pharma",
      industryName: "Farmacéutica y salud",
      source: "custom",
      labels: {
        customer: { singular: "Médico", plural: "Médicos" },
        project: { singular: " ", plural: "Visitas médicas" },
        visit: { singular: "Visita", plural: "Visitas" },
      },
      modules: { deliveries: false, catalog: true },
    });

    expect(terms.labels.customer.plural).toBe("Médicos");
    expect(terms.labels.project).toEqual({
      singular: "Seguimiento",
      plural: "Visitas médicas",
    });
    expect(terms.modules).toEqual({ deliveries: false, catalog: true });
  });

  it("concuerda el género del botón de creación", () => {
    expect(newLabel("Obra")).toBe("Nueva obra");
    expect(newLabel("Visita médica")).toBe("Nueva visita médica");
    expect(newLabel("Oportunidad")).toBe("Nueva oportunidad");
    expect(newLabel("Cliente")).toBe("Nuevo cliente");
    expect(newLabel("Punto de venta")).toBe("Nuevo punto de venta");
    expect(newLabel("Seguimiento")).toBe("Nuevo seguimiento");
  });

  it("respeta las siglas dentro de una frase", () => {
    expect(inSentence("Visitas a obra")).toBe("visitas a obra");
    expect(inSentence("CRM")).toBe("CRM");
  });
});
