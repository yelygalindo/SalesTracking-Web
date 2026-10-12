import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "@/presentation/components/Brand";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import {
  filterNavigation,
  findCurrentPage,
  matchesPath,
  navigationSections,
  type NavGroupEntry,
} from "@/components/layout/navigation";

const roleNames: Record<string, string> = {
  seller: "Personal de campo",
  supervisor: "Supervisor",
  admin: "Administrador",
  "super-admin": "Superadministrador",
  superadmin: "Superadministrador",
};
const roleLabel = (role: string) => roleNames[role.toLowerCase()] || role;

const groupContains = (group: NavGroupEntry, pathname: string) =>
  group.children.some((child) => matchesPath(pathname, child.to));

export function AppShell() {
  const { user, logout, canAny, canAll, hasRole } = useAuthorization(),
    [open, setOpen] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [expandedGroups, setExpandedGroups] = useState<string[]>([]),
    profileRef = useRef<HTMLDivElement>(null),
    location = useLocation();

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const activeGroup = navigationSections
      .flatMap((section) => section.entries)
      .find(
        (entry): entry is NavGroupEntry =>
          entry.kind === "group" && groupContains(entry, location.pathname),
      );
    // Accordion: navigating opens the current page's group and folds the rest.
    setExpandedGroups(activeGroup ? [activeGroup.id] : []);
  }, [location.pathname]);

  useEffect(() => {
    if (!open && !profileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setProfileOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, profileOpen]);

  useEffect(() => {
    document.body.classList.toggle("nav-locked", open);
    return () => document.body.classList.remove("nav-locked");
  }, [open]);

  if (!user) return null;

  const sections = filterNavigation(navigationSections, {
    canAny,
    canAll,
    hasRole,
  });
  const currentPage = findCurrentPage(sections, location.pathname);
  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const toggleGroup = (id: string) =>
    setExpandedGroups((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  const renderGroup = (group: NavGroupEntry) => {
    const { id, label, icon: Icon, children } = group;
    const expanded = expandedGroups.includes(id);
    const active = groupContains(group, location.pathname);
    return (
      <div className={`nav-group ${active ? "active" : ""}`} key={id}>
        <button
          className="nav-group-trigger"
          aria-expanded={expanded}
          aria-controls={`nav-group-${id}`}
          onClick={() => toggleGroup(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown className="nav-group-chevron" aria-hidden="true" />
        </button>
        {expanded && (
          <div className="nav-submenu" id={`nav-group-${id}`}>
            {children.map((child) => (
              <NavLink end key={child.to} to={child.to}>
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
      {open && (
        <button
          className="nav-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Cerrar navegación"
          tabIndex={-1}
        />
      )}
      <aside
        className={`app-navigation ${open ? "open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="nav-brand">
          <Brand inverse />
          <button
            className="nav-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </div>
        <nav>
          {sections.map((section) => (
            <div className="nav-section" key={section.id}>
              {section.label && <p className="nav-label">{section.label}</p>}
              {section.entries.map((entry) =>
                entry.kind === "group" ? (
                  renderGroup(entry)
                ) : (
                  <NavLink end key={entry.to} to={entry.to}>
                    <entry.icon aria-hidden="true" />
                    <span>{entry.label}</span>
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>
        <div className="nav-footer">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="nav-footer-identity">
            <strong>{user.fullName}</strong>
            <small>{user.company.name}</small>
          </div>
          <button
            className="logout"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <section className="app-workspace">
        <header className="app-topbar">
          <button
            className="topbar-menu"
            onClick={() => setOpen(true)}
            aria-label="Abrir navegación"
            aria-expanded={open}
          >
            <Menu />
          </button>
          {currentPage ? (
            <nav className="topbar-breadcrumb" aria-label="Ubicación">
              {[currentPage.section, currentPage.parent]
                .filter(Boolean)
                .map((crumb) => (
                  <span className="crumb" key={crumb}>
                    {crumb}
                    <ChevronRight aria-hidden="true" />
                  </span>
                ))}
              <strong aria-current="page">{currentPage.label}</strong>
            </nav>
          ) : (
            <span className="topbar-spacer" />
          )}
          <div className="profile" ref={profileRef}>
            <button
              className="profile-trigger"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span className="avatar">{initials}</span>
              <span className="profile-identity">
                <strong>{user.fullName}</strong>
                <small>{user.company.name}</small>
              </span>
              <ChevronDown className="profile-chevron" aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-header">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <div className="profile-roles" aria-label="Roles del usuario">
                    {user.roles.map((role) => (
                      <span key={role}>{roleLabel(role)}</span>
                    ))}
                  </div>
                </div>
                <button role="menuitem" onClick={() => void logout()}>
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
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
