import { describe, expect, it } from "vitest";
import {
  filterPages,
  paletteItemsFrom,
} from "@/components/layout/commandPaletteItems";
import { navigationSections } from "@/components/layout/navigation";

describe("búsqueda rápida", () => {
  const pages = paletteItemsFrom(navigationSections);

  it("incluye páginas sueltas y las de cada grupo con su contexto", () => {
    expect(pages).toContainEqual(
      expect.objectContaining({ label: "Estado del equipo", hint: "Equipo en vivo" }),
    );
    expect(pages).toContainEqual(
      expect.objectContaining({ label: "Agenda", to: "/reminders" }),
    );
  });

  it("filtra sin distinguir mayúsculas ni tildes", () => {
    expect(filterPages(pages, "OPERACION").map((page) => page.label)).toContain(
      "Recorridos y jornadas",
    );
    expect(filterPages(pages, "catalogo").map((page) => page.to)).toEqual([
      "/catalog/products",
      "/catalog/units",
    ]);
  });
});
