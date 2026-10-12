import { describe, expect, it } from "vitest";
import {
  buildBottomNavCandidates,
  buildNavigationSections,
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

const construction = {
  labels: {
    customer: { singular: "Cliente", plural: "Clientes" },
    project: { singular: "Obra", plural: "Obras" },
    visit: { singular: "Visita a obra", plural: "Visitas a obra" },
  },
  modules: { deliveries: true, catalog: true },
};

describe("buildNavigationSections", () => {
  it("uses the company terminology in the menu and the imports", () => {
    const sections = buildNavigationSections(construction);

    expect(findCurrentPage(sections, "/operations/active")?.label).toBe(
      "Visitas a obra en curso",
    );
    expect(findCurrentPage(sections, "/customers")?.label).toBe("Clientes");
    expect(findCurrentPage(sections, "/projects")?.label).toBe("Obras");
    expect(findCurrentPage(sections, "/projects/import")?.label).toBe("Obras");
    expect(findCurrentPage(sections, "/reports/customers")?.label).toBe(
      "Clientes",
    );
  });

  it("keeps the general terminology by default", () => {
    expect(findCurrentPage(navigationSections, "/projects")?.label).toBe(
      "Seguimientos",
    );
    expect(
      findCurrentPage(navigationSections, "/operations/active")?.label,
    ).toBe("Visitas en curso");
  });

  it("labels the mobile shortcuts with the company terminology", () => {
    expect(
      buildBottomNavCandidates(construction).map((entry) => entry.label),
    ).toEqual(["Inicio", "Agenda", "Visitas a obra", "Clientes", "Obras"]);
  });
});

describe("filterNavigation with modules", () => {
  const everything = checkFor([
    "products.read",
    "products.import",
    "units.read",
    "units.import",
    "deliveries.read",
    "reports.read",
    "customers.read",
  ]);

  it("hides the catalog and its imports when the module is off", () => {
    const sections = filterNavigation(navigationSections, everything, {
      deliveries: true,
      catalog: false,
    });

    expect(findCurrentPage(sections, "/catalog/products")).toBeUndefined();
    expect(findCurrentPage(sections, "/catalog/products/import")).toBeUndefined();
    expect(findCurrentPage(sections, "/deliveries")?.label).toBe(
      "Compromisos y entregas",
    );
  });

  it("hides deliveries and their report when the module is off", () => {
    const sections = filterNavigation(navigationSections, everything, {
      deliveries: false,
      catalog: true,
    });

    expect(findCurrentPage(sections, "/deliveries")).toBeUndefined();
    expect(findCurrentPage(sections, "/reports/deliveries")).toBeUndefined();
    expect(findCurrentPage(sections, "/reports/customers")?.label).toBe(
      "Contactos",
    );
    expect(findCurrentPage(sections, "/catalog/products")?.label).toBe(
      "Productos",
    );
  });

  it("shows the operation settings page only with companies.update", () => {
    expect(
      findCurrentPage(
        filterNavigation(navigationSections, checkFor(["companies.update"])),
        "/admin/operation",
      )?.label,
    ).toBe("Operación por rubro");
    expect(
      findCurrentPage(
        filterNavigation(navigationSections, checkFor(["companies.read"])),
        "/admin/operation",
      ),
    ).toBeUndefined();
  });
});
