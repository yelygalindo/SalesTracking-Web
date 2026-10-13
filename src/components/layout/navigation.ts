import {
  Activity,
  BarChart3,
  MapPin,
  Boxes,
  CalendarClock,
  ContactRound,
  FileUp,
  LifeBuoy,
  LayoutDashboard,
  Radar,
  Route,
  Settings,
  Target,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { OperationModules } from "@/features/operation-settings/api/operationSettingsApi";
import {
  defaultOperationTerms,
  type OperationTerms,
} from "@/features/operation-settings/services/operationTerms";

export type NavAccess = {
  /** Visible to every signed-in user. */
  everyone?: boolean;
  permissions?: string[];
  allPermissions?: string[];
  roles?: string[];
};

/** Optional module the entry belongs to; it is hidden when the company turns that module off. */
export type NavModule = { module?: keyof OperationModules };

export type NavChild = NavAccess & NavModule & { to: string; label: string };

/** Kept for the breadcrumb and the search palette, but not drawn in the sidebar. */
export type NavVisibility = { hidden?: boolean };

export type NavLinkEntry = NavAccess & NavModule & NavVisibility & {
  kind: "link";
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * Sibling pages shown as tabs in the page header instead of a submenu. When present,
   * the entry is reachable if any tab is, and it opens the first reachable tab.
   */
  tabs?: NavChild[];
};

export type NavGroupEntry = NavModule & NavVisibility & {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
};

export type NavEntry = NavLinkEntry | NavGroupEntry;

export type NavSection = { id: string; label?: string; entries: NavEntry[] };

/** Data the shell shares with its pages through the router outlet. */
export interface ShellOutletContext {
  /** Last page visited before the current one, used for support context. */
  previousPage?: string;
}

/** Menu for the company's terminology ("Obras", "Visitas a obra en curso"…). */
export const buildNavigationSections = ({
  labels: { customer, project, visit },
}: OperationTerms): NavSection[] => [
  {
    id: "home",
    entries: [
      {
        kind: "link",
        to: "/",
        label: "Resumen",
        icon: LayoutDashboard,
        permissions: ["dashboard.read", "platform-dashboard.read"],
      },
      {
        kind: "link",
        to: "/reminders",
        label: "Agenda",
        icon: CalendarClock,
        permissions: ["customers.read"],
      },
    ],
  },
  {
    id: "operation",
    label: "Operación",
    entries: [
      {
        kind: "link",
        to: "/operations/dashboard",
        label: "Equipo en vivo",
        icon: Radar,
        tabs: [
          {
            to: "/operations/dashboard",
            label: "Estado del equipo",
            permissions: ["visits.read"],
          },
          {
            to: "/operations/active",
            label: `${visit.plural} en curso`,
            permissions: ["visits.read"],
          },
        ],
      },
      {
        kind: "link",
        to: "/operations/history",
        label: "Recorridos y jornadas",
        icon: Route,
        permissions: ["visits.read"],
      },
      {
        kind: "link",
        to: "/activity",
        label: "Actividades",
        icon: Activity,
        permissions: ["timeline.read"],
      },
      {
        kind: "link",
        to: "/operations/productivity",
        label: "Productividad",
        icon: BarChart3,
        permissions: ["reports.read"],
      },
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    entries: [
      {
        kind: "link",
        to: "/customers",
        label: customer.plural,
        icon: ContactRound,
        permissions: ["customers.read"],
      },
      {
        kind: "link",
        to: "/projects",
        label: project.plural,
        icon: Target,
        tabs: [
          { to: "/projects", label: project.plural, permissions: ["projects.read"] },
          {
            to: "/projects/pipeline",
            label: "Embudo",
            allPermissions: ["projects.read", "reports.read"],
          },
        ],
      },
      {
        kind: "link",
        to: "/deliveries",
        label: "Entregas",
        module: "deliveries",
        icon: Truck,
        permissions: ["deliveries.read"],
      },
      {
        kind: "link",
        to: "/catalog/products",
        label: "Catálogo",
        module: "catalog",
        icon: Boxes,
        tabs: [
          {
            to: "/catalog/products",
            label: "Productos",
            permissions: ["products.read"],
          },
          {
            to: "/catalog/units",
            label: "Unidades",
            allPermissions: ["products.read", "units.read"],
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    entries: [
      {
        kind: "group",
        id: "imports",
        label: "Importar datos",
        icon: FileUp,
        // Reached from the "Importar" button of each listing.
        hidden: true,
        children: [
          {
            to: "/customers/import",
            label: customer.plural,
            allPermissions: ["customers.read", "customers.import"],
          },
          {
            to: "/projects/import",
            label: project.plural,
            allPermissions: ["projects.read", "projects.import"],
          },
          {
            to: "/catalog/products/import",
            label: "Productos",
            module: "catalog",
            allPermissions: ["products.read", "products.import"],
          },
          {
            to: "/catalog/units/import",
            label: "Unidades",
            module: "catalog",
            allPermissions: ["products.read", "units.read", "units.import"],
          },
        ],
      },
      {
        kind: "group",
        id: "admin",
        label: "Administración",
        icon: Settings,
        children: [
          {
            to: "/admin/users",
            label: "Usuarios",
            permissions: ["users.read"],
          },
          {
            to: "/admin/invite",
            label: "Invitar usuario",
            permissions: ["invitations.create"],
          },
          {
            to: "/admin/invitations",
            label: "Invitaciones",
            permissions: ["invitations.create"],
          },
          {
            to: "/admin/time-zone",
            label: "Zona horaria",
            roles: ["admin", "super-admin", "superadmin"],
          },
          {
            to: "/admin/operation",
            label: "Operación por rubro",
            permissions: ["companies.update"],
          },
          {
            to: "/admin/companies",
            label: "Empresas",
            permissions: ["companies.create"],
          },
        ],
      },
      {
        kind: "link",
        to: "/support",
        label: "Ayuda y soporte",
        icon: LifeBuoy,
        everyone: true,
        // Offered from the profile menu.
        hidden: true,
      },
    ],
  },
];

/** Menu with the default ("general") terminology. */
export const navigationSections = buildNavigationSections(defaultOperationTerms);

export type AccessCheck = {
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
};

export const isAllowed = (access: NavAccess, check: AccessCheck) =>
  access.everyone === true ||
  (access.permissions !== undefined && check.canAny(access.permissions)) ||
  (access.allPermissions !== undefined &&
    check.canAll(access.allPermissions)) ||
  (access.roles !== undefined &&
    access.roles.some((role) => check.hasRole(role)));

const moduleEnabled = (entry: NavModule, modules?: OperationModules) =>
  !entry.module || !modules || modules[entry.module];

/**
 * Removes entries, groups and sections the current user cannot reach, and those of
 * modules the company turned off.
 */
export function filterNavigation(
  sections: NavSection[],
  check: AccessCheck,
  modules?: OperationModules,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.flatMap<NavEntry>((entry) => {
        if (!moduleEnabled(entry, modules)) return [];
        const reachable = (child: NavChild) =>
          moduleEnabled(child, modules) && isAllowed(child, check);
        if (entry.kind === "link") {
          if (!entry.tabs) return isAllowed(entry, check) ? [entry] : [];
          const tabs = entry.tabs.filter(reachable);
          return tabs.length ? [{ ...entry, to: tabs[0].to, tabs }] : [];
        }
        const children = entry.children.filter(reachable);
        return children.length ? [{ ...entry, children }] : [];
      }),
    }))
    .filter((section) => section.entries.length > 0);
}

export const matchesPath = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to;

/** Pages grouped under an entry: a group's submenu or a link's tabs. */
export const subpagesOf = (entry: NavEntry): NavChild[] =>
  entry.kind === "group" ? entry.children : (entry.tabs ?? []);

/** Whether the entry represents the current page, directly or through one of its subpages. */
export const entryContains = (entry: NavEntry, pathname: string) =>
  (entry.kind === "link" && matchesPath(pathname, entry.to)) ||
  subpagesOf(entry).some((child) => matchesPath(pathname, child.to));

/** Finds the navigation entry that represents the current page, for the topbar breadcrumb. */
export function findCurrentPage(sections: NavSection[], pathname: string) {
  for (const section of sections)
    for (const entry of section.entries) {
      const child = subpagesOf(entry).find((item) =>
        matchesPath(pathname, item.to),
      );
      if (child)
        return { section: section.label, parent: entry.label, label: child.label };
      if (entry.kind === "link" && matchesPath(pathname, entry.to))
        return { section: section.label, parent: undefined, label: entry.label };
    }
  return undefined;
}

/** Tabs to show in the header of the current page, when it belongs to a tabbed entry. */
export function findPageTabs(sections: NavSection[], pathname: string) {
  for (const section of sections)
    for (const entry of section.entries)
      if (
        entry.kind === "link" &&
        entry.tabs &&
        entry.tabs.some((tab) => matchesPath(pathname, tab.to))
      )
        return entry.tabs.length > 1 ? entry.tabs : [];
  return [];
}

/** Shortcuts for the mobile bottom bar, in priority order; the first four allowed are shown. */
export const buildBottomNavCandidates = ({
  labels: { customer, project, visit },
}: OperationTerms): NavLinkEntry[] => [
  {
    kind: "link",
    to: "/",
    label: "Inicio",
    icon: LayoutDashboard,
    permissions: ["dashboard.read", "platform-dashboard.read"],
  },
  {
    kind: "link",
    to: "/reminders",
    label: "Agenda",
    icon: CalendarClock,
    permissions: ["customers.read"],
  },
  {
    kind: "link",
    to: "/operations/active",
    label: visit.plural,
    icon: MapPin,
    permissions: ["visits.read"],
  },
  {
    kind: "link",
    to: "/customers",
    label: customer.plural,
    icon: ContactRound,
    permissions: ["customers.read"],
  },
  {
    kind: "link",
    to: "/projects",
    label: project.plural,
    icon: Target,
    permissions: ["projects.read"],
  },
];

export const bottomNavCandidates = buildBottomNavCandidates(defaultOperationTerms);
