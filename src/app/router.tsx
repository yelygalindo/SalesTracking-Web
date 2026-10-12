import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/app/routes/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/routes/PublicOnlyRoute";
import { PermissionRoute } from "@/app/routes/PermissionRoute";
import { HomeRoute } from "@/app/routes/HomeRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { UnauthorizedPage } from "@/features/auth/pages/UnauthorizedPage";
import { NotFoundPage } from "@/features/auth/pages/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";
import { RouteErrorPage } from "@/components/feedback/RouteErrorPage";
import { lazyPage } from "@/app/lazyPage";

// Pages are split into their own chunks and downloaded on first visit.
const CustomersPage = lazyPage(() => import("@/features/customers/pages/CustomersPage"), "CustomersPage");
const CustomerImportPage = lazyPage(() => import("@/features/customers/pages/CustomerImportPage"), "CustomerImportPage");
const ProjectsPage = lazyPage(() => import("@/features/projects/pages/ProjectsPage"), "ProjectsPage");
const ProjectImportPage = lazyPage(() => import("@/features/projects/pages/ProjectImportPage"), "ProjectImportPage");
const CatalogPage = lazyPage(() => import("@/features/catalog/pages/CatalogPage"), "CatalogPage");
const CatalogImportPage = lazyPage(() => import("@/features/catalog/pages/CatalogImportPage"), "CatalogImportPage");
const OperationsPage = lazyPage(() => import("@/features/operations/pages/OperationsPage"), "OperationsPage");
const OperationsDashboardPage = lazyPage(() => import("@/features/operations/pages/OperationsDashboardPage"), "OperationsDashboardPage");
const DeliveriesPage = lazyPage(() => import("@/features/deliveries/pages/DeliveriesPage"), "DeliveriesPage");
const ReportsPage = lazyPage(() => import("@/features/reports/pages/ReportsPageWithScope"), "ReportsPage");
const AdminPage = lazyPage(() => import("@/features/admin/pages/AdminPage"), "AdminPage");
const AcceptInvitationPage = lazyPage(() => import("@/features/admin/pages/AcceptInvitationPage"), "AcceptInvitationPage");
const SupportPage = lazyPage(() => import("@/features/support/pages/SupportPage"), "SupportPage");
const RemindersPage = lazyPage(() => import("@/features/reminders/pages/RemindersPage"), "RemindersPage");

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/accept-invitation", element: <AcceptInvitationPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <HomeRoute /> },
          { path: "/support", element: <SupportPage /> },
          {
            element: <PermissionRoute permission="customers.read" />,
            children: [{ path: "/customers", element: <CustomersPage /> }],
          },
          {
            element: <PermissionRoute permission="customers.import" />,
            children: [
              { path: "/customers/import", element: <CustomerImportPage /> },
            ],
          },
          {
            element: <PermissionRoute permission="customers.read" />,
            children: [{ path: "/reminders", element: <RemindersPage /> }],
          },
          {
            element: <PermissionRoute permission="projects.read" />,
            children: [{ path: "/projects", element: <ProjectsPage /> }],
          },
          {
            element: <PermissionRoute permission="projects.import" />,
            children: [
              { path: "/projects/import", element: <ProjectImportPage /> },
            ],
          },
          {
            element: <PermissionRoute permission="products.read" />,
            children: [
              { path: "/catalog/:section?", element: <CatalogPage /> },
            ],
          },
          {
            element: <PermissionRoute permission="products.import" />,
            children: [
              {
                path: "/catalog/products/import",
                element: <CatalogImportPage kind="products" />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="units.import" />,
            children: [
              {
                path: "/catalog/units/import",
                element: <CatalogImportPage kind="units" />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="visits.read" />,
            children: [
              {
                path: "/operations/dashboard",
                element: <OperationsDashboardPage />,
              },
              { path: "/operations/:section?", element: <OperationsPage /> },
            ],
          },
          {
            element: <PermissionRoute permission="deliveries.read" />,
            children: [{ path: "/deliveries", element: <DeliveriesPage /> }],
          },
          {
            element: <PermissionRoute permission="reports.read" />,
            children: [{ path: "/reports/:type?", element: <ReportsPage /> }],
          },
          {
            element: (
              <PermissionRoute
                anyOf={["invitations.create", "companies.create", "users.read"]}
              />
            ),
            children: [{ path: "/admin/:section?", element: <AdminPage /> }],
          },
        ],
      },
      { path: "/unauthorized", element: <UnauthorizedPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
