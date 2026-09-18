import { Navigate } from "react-router-dom";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { DashboardPage } from "@/features/dashboard/pages/OperationalDashboardPage";
import { PlatformDashboardPage } from "@/features/dashboard/pages/PlatformDashboardPage";

export function HomeRoute() {
  const { can } = useAuthorization();

  if (can("dashboard.read")) return <DashboardPage />;
  if (can("platform-dashboard.read")) return <PlatformDashboardPage />;
  if (can("companies.create")) return <Navigate to="/admin/companies" replace />;

  return <Navigate to="/unauthorized" replace />;
}
