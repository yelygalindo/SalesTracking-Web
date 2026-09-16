import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
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
    permissions: ["dashboard.read"],
    end: true,
  },
  {
    to: "/customers",
    label: "Clientes",
    icon: Users,
    permissions: ["customers.read"],
  },
  {
    to: "/reminders",
    label: "Recordatorios",
    icon: CalendarClock,
    permissions: ["customers.read"],
  },
  {
    to: "/projects",
    label: "Obras",
    icon: Building2,
    permissions: ["projects.read"],
  },
  {
    to: "/catalog",
    label: "Productos",
    icon: Boxes,
    permissions: ["products.read"],
  },
  {
    to: "/deliveries",
    label: "Entregas",
    icon: PackageCheck,
    permissions: ["deliveries.read"],
  },
  {
    to: "/operations",
    label: "Operación",
    icon: Route,
    permissions: ["visits.read"],
  },
  {
    to: "/reports",
    label: "Reportes",
    icon: BarChart3,
    permissions: ["reports.read"],
  },
  {
    to: "/admin",
    label: "Administración",
    icon: Settings,
    permissions: ["invitations.create", "companies.create"],
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
  const { user, logout, canAny } = useAuthorization(),
    [open, setOpen] = useState(false),
    location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  if (!user) return null;
  const allowed = items.filter((item) => canAny(item.permissions));
  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
          {allowed.map(({ to, label, icon: Icon, end }) => (
            <NavLink end={end} key={to} to={to}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
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
