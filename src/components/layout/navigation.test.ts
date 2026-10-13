import { describe, expect, it } from "vitest";
import {
  buildBottomNavCandidates,
  findPageTabs,
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
        parent: "Equipo en vivo",
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
    expect(findCurrentPage(sections, "/projects/pipeline")).toEqual({
      section: "Comercial",
      parent: "Obras",
      label: "Embudo",
    });
  });

  it("places each former report inside its module", () => {
    const sections = buildNavigationSections(construction);

    expect(sections.map((section) => section.id)).not.toContain("analysis");
    expect(findCurrentPage(sections, "/operations/productivity")?.section).toBe(
      "Operación",
    );
    expect(findCurrentPage(sections, "/admin/users")).toEqual({
      section: "Configuración",
      parent: "Administración",
      label: "Usuarios",
    });
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
    expect(findCurrentPage(sections, "/deliveries")?.label).toBe("Entregas");
  });

  it("hides deliveries when the module is off", () => {
    const sections = filterNavigation(navigationSections, everything, {
      deliveries: false,
      catalog: true,
    });

    expect(findCurrentPage(sections, "/deliveries")).toBeUndefined();
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

describe("page tabs", () => {
  it("groups live monitoring pages under one entry shown as tabs", () => {
    const tabs = findPageTabs(navigationSections, "/operations/active");

    expect(tabs.map((tab) => tab.to)).toEqual([
      "/operations/dashboard",
      "/operations/active",
    ]);
    expect(findPageTabs(navigationSections, "/customers")).toEqual([]);
  });

  it("opens the first reachable tab and hides tabs without permission", () => {
    const sections = filterNavigation(
      navigationSections,
      checkFor(["products.read"]),
    );
    const catalog = sections
      .flatMap((section) => section.entries)
      .find((entry) => entry.label === "Catálogo");

    expect(catalog?.kind === "link" && catalog.to).toBe("/catalog/products");
    // A single remaining tab is not worth a tab bar.
    expect(findPageTabs(sections, "/catalog/products")).toEqual([]);
  });

  it("keeps hidden entries reachable for the breadcrumb", () => {
    const imports = navigationSections
      .flatMap((section) => section.entries)
      .find((entry) => entry.label === "Importar datos");

    expect(imports?.hidden).toBe(true);
    expect(findCurrentPage(navigationSections, "/customers/import")?.parent).toBe(
      "Importar datos",
    );
  });
});
