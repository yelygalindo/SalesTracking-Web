import { Navigate } from "react-router-dom";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { lazyPage } from "@/app/lazyPage";

const DashboardPage = lazyPage(
  () => import("@/features/dashboard/pages/OperationalDashboardPage"),
  "DashboardPage",
);
const PlatformDashboardPage = lazyPage(
  () => import("@/features/dashboard/pages/PlatformDashboardPage"),
  "PlatformDashboardPage",
);

export function HomeRoute() {
  const { can } = useAuthorization();

  if (can("dashboard.read")) return <DashboardPage />;
  if (can("platform-dashboard.read")) return <PlatformDashboardPage />;
  if (can("companies.create")) return <Navigate to="/admin/companies" replace />;

  return <Navigate to="/unauthorized" replace />;
}
