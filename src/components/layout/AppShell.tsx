import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Ellipsis,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "@/presentation/components/Brand";
import { PageSkeleton } from "@/components/feedback/Skeleton";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { TrialBanner } from "@/features/trial-signups/components/TrialBanner";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  buildBottomNavCandidates,
  entryContains,
  isAllowed,
  findCurrentPage,
  findPageTabs,
  matchesPath,
  navigationSections,
  type NavGroupEntry,
  type ShellOutletContext,
} from "@/components/layout/navigation";
import { useNavigationSections } from "@/components/layout/useNavigationSections";

const roleNames: Record<string, string> = {
  seller: "Personal de campo",
  supervisor: "Supervisor",
  admin: "Administrador",
  "super-admin": "Superadministrador",
  superadmin: "Superadministrador",
};
const roleLabel = (role: string) => roleNames[role.toLowerCase()] || role;

const collapsedKey = "urbantrack:nav-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(collapsedKey) === "1";
  } catch {
    return false;
  }
};

const groupContains = (group: NavGroupEntry, pathname: string) =>
  group.children.some((child) => matchesPath(pathname, child.to));

export function AppShell() {
  const { user, logout, canAny, canAll, hasRole } = useAuthorization(),
    [open, setOpen] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [expandedGroups, setExpandedGroups] = useState<string[]>([]),
    [collapsedPreference, setCollapsed] = useState(readCollapsed),
    isDesktop = useMediaQuery("(min-width: 901px)"),
    collapsed = collapsedPreference && isDesktop,
    [previousPage, setPreviousPage] = useState<string>(),
    currentPath = useRef<string>(undefined),
    profileRef = useRef<HTMLDivElement>(null),
    location = useLocation(),
    terms = useOperationTerms(),
    sections = useNavigationSections();

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  // Remember the page left behind so Support can tell where a problem happened.
  useEffect(() => {
    const path = location.pathname + location.search;
    if (currentPath.current && currentPath.current !== path)
      setPreviousPage(currentPath.current);
    currentPath.current = path;
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
    try {
      localStorage.setItem(collapsedKey, collapsedPreference ? "1" : "0");
    } catch {
      // Storage can be unavailable (private mode); the preference just is not kept.
    }
  }, [collapsedPreference]);

  useEffect(() => {
    document.body.classList.toggle("nav-locked", open);
    return () => document.body.classList.remove("nav-locked");
  }, [open]);

  if (!user) return null;

  const access = { canAny, canAll, hasRole };
  const shortcuts = buildBottomNavCandidates(terms)
    .filter((entry) => isAllowed(entry, access))
    .slice(0, 4);
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
          title={collapsed ? label : undefined}
          onClick={() => {
            // A collapsed rail has no room for submenus: expand it first.
            if (collapsed) {
              setCollapsed(false);
              setExpandedGroups([id]);
            } else toggleGroup(id);
          }}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown className="nav-group-chevron" aria-hidden="true" />
        </button>
        {expanded && !collapsed && (
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
    <div className={`app-shell-root${collapsed ? " nav-collapsed" : ""}`}>
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
            className="nav-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button
            className="nav-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </div>
        <nav>
          {sections.map((section) => {
            const visibleEntries = section.entries.filter((entry) => !entry.hidden);
            return visibleEntries.length > 0 && (
            <div className="nav-section" key={section.id}>
              {section.label && <p className="nav-label">{section.label}</p>}
              {visibleEntries.map((entry) =>
                entry.kind === "group" ? (
                  renderGroup(entry)
                ) : (
                  <NavLink
                    end
                    key={entry.to}
                    to={entry.to}
                    className={({ isActive }) =>
                      isActive || entryContains(entry, location.pathname)
                        ? "active"
                        : ""
                    }
                    title={collapsed ? entry.label : undefined}
                  >
                    <entry.icon aria-hidden="true" />
                    <span>{entry.label}</span>
                  </NavLink>
                ),
              )}
            </div>
            );
          })}
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
          <CommandPalette
            sections={sections}
            canSearchCustomers={canAny(["customers.read"])}
          />
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
                <NavLink className="profile-menu-link" role="menuitem" to="/support">
                  <LifeBuoy aria-hidden="true" />
                  Ayuda y soporte
                </NavLink>
                <button role="menuitem" onClick={() => void logout()}>
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>
        {user.company.trialEndsAtUtc && (
          <TrialBanner trialEndsAtUtc={user.company.trialEndsAtUtc} />
        )}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet context={{ previousPage } satisfies ShellOutletContext} />
        </Suspense>
      </section>
      {shortcuts.length > 1 && (
        <nav className="bottom-nav" aria-label="Accesos rápidos">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <NavLink end key={to} to={to}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Más opciones de navegación"
          >
            <Ellipsis aria-hidden="true" />
            <span>Más</span>
          </button>
        </nav>
      )}
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
  const { pathname } = useLocation();
  const tabs = findPageTabs(useNavigationSections(), pathname);
  return (
    <>
      <header className={`shared-page-header${tabs.length ? " with-tabs" : ""}`}>
        <div>
          {eyebrow && <p className="overline">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      <PageTabs />
    </>
  );
}

/** Sibling pages of the current one, for pages that draw their own header. */
export function PageTabs() {
  const { pathname } = useLocation();
  const tabs = findPageTabs(useNavigationSections(), pathname);
  if (!tabs.length) return null;
  return (
    <nav className="page-tabs" aria-label="Secciones de esta página">
      {tabs.map((tab) => (
        <NavLink end key={tab.to} to={tab.to}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
