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
import { CustomersPage } from "@/features/customers/pages/CustomersPage";
import { ProjectsPage } from "@/features/projects/pages/ProjectsPage";
import { CatalogPage } from "@/features/catalog/pages/CatalogPage";
import { OperationsPage } from "@/features/operations/pages/OperationsPage";
import { DeliveriesPage } from "@/features/deliveries/pages/DeliveriesPage";
import { ReportsPage } from "@/features/reports/pages/ReportsPageWithScope";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { AcceptInvitationPage } from "@/features/admin/pages/AcceptInvitationPage";
import { RemindersPage } from "@/features/reminders/pages/RemindersPage";
import { AppShell } from "@/components/layout/AppShell";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/accept-invitation", element: <AcceptInvitationPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <HomeRoute /> },
          {
            element: <PermissionRoute permission="customers.read" />,
            children: [{ path: "/customers", element: <CustomersPage /> }],
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
            element: <PermissionRoute permission="products.read" />,
            children: [{ path: "/catalog", element: <CatalogPage /> }],
          },
          {
            element: <PermissionRoute permission="visits.read" />,
            children: [{ path: "/operations", element: <OperationsPage /> }],
          },
          {
            element: <PermissionRoute permission="deliveries.read" />,
            children: [{ path: "/deliveries", element: <DeliveriesPage /> }],
          },
          {
            element: <PermissionRoute permission="reports.read" />,
            children: [{ path: "/reports", element: <ReportsPage /> }],
          },
          {
            element: (
              <PermissionRoute
                anyOf={["invitations.create", "companies.create"]}
              />
            ),
            children: [{ path: "/admin", element: <AdminPage /> }],
          },
        ],
      },
      { path: "/unauthorized", element: <UnauthorizedPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
