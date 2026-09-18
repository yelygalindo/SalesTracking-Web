import { Navigate } from "react-router-dom";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { DashboardPage } from "@/features/dashboard/pages/OperationalDashboardPage";

export function HomeRoute() {
  const { can } = useAuthorization();

  if (can("dashboard.read")) return <DashboardPage />;
  if (can("companies.create")) return <Navigate to="/admin" replace />;

  return <Navigate to="/unauthorized" replace />;
}
