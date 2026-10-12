import { describe, expect, it } from "vitest";
import {
  filterNavigation,
  findCurrentPage,
  navigationSections,
} from "@/components/layout/navigation";

const checkFor = (permissions: string[], roles: string[] = []) => ({
  canAny: (required: string[]) =>
    required.some((item) => permissions.includes(item)),
  canAll: (required: string[]) =>
    required.every((item) => permissions.includes(item)),
  hasRole: (role: string) => roles.includes(role),
});

describe("filterNavigation", () => {
  it("drops sections and groups without reachable entries", () => {
    const sections = filterNavigation(
      navigationSections,
      checkFor(["companies.create"]),
    );

    expect(sections.map((section) => section.id)).toEqual(["settings"]);
    const [admin, help] = sections[0].entries;
    expect(help.kind === "link" && help.to).toBe("/support");
    expect(admin.kind === "group" && admin.children.map((c) => c.to)).toEqual([
      "/admin/companies",
    ]);
  });

  it("requires every permission for import entries", () => {
    const sections = filterNavigation(
      navigationSections,
      checkFor(["customers.import"]),
    );

    expect(findCurrentPage(sections, "/customers/import")).toBeUndefined();
  });

  it("always offers help and support", () => {
    const sections = filterNavigation(navigationSections, checkFor([]));

    expect(findCurrentPage(sections, "/support")?.label).toBe("Ayuda y soporte");
  });

  it("grants role based entries", () => {
    const sections = filterNavigation(
      navigationSections,
      checkFor([], ["admin"]),
    );

    expect(findCurrentPage(sections, "/admin/time-zone")?.label).toBe(
      "Zona horaria",
    );
  });
});

describe("findCurrentPage", () => {
  it("returns the breadcrumb for grouped pages", () => {
    expect(findCurrentPage(navigationSections, "/operations/dashboard")).toEqual(
      {
        section: "Operación",
        parent: "Monitoreo en vivo",
        label: "Estado del equipo",
      },
    );
  });

  it("matches paths exactly so imports do not highlight their listing", () => {
    expect(findCurrentPage(navigationSections, "/customers/import")?.parent).toBe(
      "Importar datos",
    );
    expect(findCurrentPage(navigationSections, "/customers/123")).toBeUndefined();
  });
});
