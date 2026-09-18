import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Route,
  Settings,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "@/presentation/components/Brand";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";

const items = [
  {
    to: "/",
    label: "Resumen",
    icon: LayoutDashboard,
    permissions: ["dashboard.read", "platform-dashboard.read"],
    end: true,
  },
  {
    to: "/reminders",
    label: "Recordatorios",
    icon: CalendarClock,
    permissions: ["customers.read"],
  },
  {
    to: "/deliveries",
    label: "Entregas",
    icon: PackageCheck,
    permissions: ["deliveries.read"],
  },
];
const groups = [
  {
    id: "customers",
    label: "Clientes",
    icon: Users,
    path: "/customers",
    children: [
      { to: "/customers", label: "Listado", permissions: ["customers.read"] },
      {
        to: "/customers/import",
        label: "Importar",
        allPermissions: ["customers.read", "customers.import"],
      },
    ],
  },
  {
    id: "projects",
    label: "Proyectos",
    icon: Building2,
    path: "/projects",
    children: [
      { to: "/projects", label: "Listado", permissions: ["projects.read"] },
      {
        to: "/projects/import",
        label: "Importar",
        allPermissions: ["projects.read", "projects.import"],
      },
    ],
  },
  {
    id: "operations",
    label: "Operación",
    icon: Route,
    path: "/operations",
    children: [
      {
        to: "/operations/active",
        label: "Vendedores activos",
        permissions: ["visits.read"],
      },
      {
        to: "/operations/history",
        label: "Historial de jornadas",
        permissions: ["visits.read"],
      },
    ],
  },
  {
    id: "catalog",
    label: "Productos",
    icon: Boxes,
    path: "/catalog",
    children: [
      {
        to: "/catalog/products",
        label: "Catálogo",
        permissions: ["products.read"],
      },
      {
        to: "/catalog/units",
        label: "Unidades",
        allPermissions: ["products.read", "units.read"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    icon: BarChart3,
    path: "/reports",
    children: [
      {
        to: "/reports/customers",
        label: "Clientes",
        permissions: ["reports.read"],
      },
      {
        to: "/reports/deliveries",
        label: "Entregas",
        permissions: ["reports.read"],
      },
      {
        to: "/reports/productivity",
        label: "Productividad",
        permissions: ["reports.read"],
      },
      {
        to: "/reports/commercial-activity",
        label: "Actividad comercial",
        permissions: ["reports.read"],
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Settings,
    path: "/admin",
    children: [
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
      { to: "/admin/users", label: "Usuarios", permissions: ["users.read"] },
      {
        to: "/admin/time-zone",
        label: "Zona horaria",
        roles: ["admin", "super-admin", "superadmin"],
      },
      {
        to: "/admin/companies",
        label: "Empresas",
        permissions: ["companies.create"],
      },
    ],
  },
];
const roleNames: Record<string, string> = {
  seller: "Vendedor",
  supervisor: "Supervisor",
  admin: "Administrador",
  "super-admin": "Superadministrador",
  superadmin: "Superadministrador",
};
const roleLabel = (role: string) => roleNames[role.toLowerCase()] || role;

export function AppShell() {
  const { user, logout, canAny, canAll, hasRole } = useAuthorization(),
    [open, setOpen] = useState(false),
    [expandedGroups, setExpandedGroups] = useState<string[]>([]),
    location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const activeGroup = groups.find(
      (group) =>
        location.pathname === group.path ||
        location.pathname.startsWith(`${group.path}/`),
    );
    if (activeGroup)
      setExpandedGroups((current) =>
        current.includes(activeGroup.id)
          ? current
          : [...current, activeGroup.id],
      );
  }, [location.pathname]);
  if (!user) return null;
  const allowed = items.filter((item) => canAny(item.permissions));
  const allowedGroups = groups
    .map((group) => ({
      ...group,
      children: group.children.filter(
        (child) =>
          ("permissions" in child &&
            Boolean(child.permissions) &&
            canAny(child.permissions!)) ||
          ("allPermissions" in child &&
            Boolean(child.allPermissions) &&
            canAll(child.allPermissions!)) ||
          ("roles" in child &&
            Boolean(child.roles) &&
            child.roles!.some((role) => hasRole(role))),
      ),
    }))
    .filter((group) => group.children.length > 0);
  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const renderGroup = ({
    id,
    label,
    icon: Icon,
    path,
    children,
  }: (typeof allowedGroups)[number]) => {
    const expanded = expandedGroups.includes(id);
    const active =
      location.pathname === path || location.pathname.startsWith(`${path}/`);
    return (
      <div className={`nav-group ${active ? "active" : ""}`} key={id}>
        <button
          className="nav-group-trigger"
          aria-expanded={expanded}
          onClick={() =>
            setExpandedGroups((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
        >
          <Icon />
          <span>{label}</span>
          <ChevronDown className="nav-group-chevron" />
        </button>
        {expanded && (
          <div className="nav-submenu">
            {children.map((child) => (
              <NavLink
                className={() =>
                  child.to.includes("?")
                    ? `${location.pathname}${location.search}` === child.to
                      ? "active"
                      : ""
                    : location.pathname === child.to
                      ? "active"
                      : ""
                }
                key={child.to}
                to={child.to}
              >
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="app-shell-root">
      <button
        className="mobile-nav-trigger"
        onClick={() => setOpen(true)}
        aria-label="Abrir navegación"
      >
        <Menu />
      </button>
      {open && (
        <button
          className="nav-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}
      <aside className={`app-navigation ${open ? "open" : ""}`}>
        <div className="nav-brand">
          <Brand inverse />
          <button onClick={() => setOpen(false)} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <p className="nav-label">Operación</p>
        <nav>
          {allowed
            .filter((item) => item.to === "/")
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink end={end} key={to} to={to}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          {allowedGroups
            .filter((group) => group.id === "customers")
            .map(renderGroup)}
          {allowed
            .filter((item) => item.to !== "/")
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink end={end} key={to} to={to}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          {allowedGroups
            .filter((group) => group.id !== "customers")
            .map(renderGroup)}
        </nav>
        <button className="logout" onClick={() => void logout()}>
          <LogOut />
          Cerrar sesión
        </button>
      </aside>
      <section className="app-workspace">
        <header className="app-topbar">
          <button onClick={() => setOpen(true)} aria-label="Abrir navegación">
            <Menu />
          </button>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <div className="profile-identity">
              <strong>{user.fullName}</strong>
              <small>{user.company.name}</small>
              <div className="profile-roles" aria-label="Roles del usuario">
                {user.roles.map((role) => (
                  <span key={role}>{roleLabel(role)}</span>
                ))}
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </section>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="shared-page-header">
      <div>
        {eyebrow && <p className="overline">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
