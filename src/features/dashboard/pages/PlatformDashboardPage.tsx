import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Mail,
  Contact,
  HardHat,
  PackageCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { platformDashboardApi } from "../api/platformDashboardApi";
export function PlatformDashboardPage() {
  const query = useQuery({
    queryKey: ["platform-dashboard"],
    queryFn: platformDashboardApi.get,
  });
  return (
    <main className="dashboard-content">
      <PageHeader
        eyebrow="Plataforma"
        title="Resumen global"
        description="Estado general de las empresas y su operación."
      />
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.data}
        empty="No hay información disponible."
      >
        {query.data && (
          <section className="real-metrics platform-metrics">
            {[
              ["Empresas", query.data.totalCompanies, Building2],
              ["Empresas activas", query.data.activeCompanies, Building2],
              ["Usuarios activos", query.data.activeUsers, Users],
              ["Invitaciones pendientes", query.data.pendingInvitations, Mail],
              ["Clientes", query.data.totalCustomers, Contact],
              ["Obras activas", query.data.activeProjects, HardHat],
              [
                "Entregas pendientes",
                query.data.pendingDeliveries,
                PackageCheck,
              ],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Building2;
              return (
                <article className="metric-card" key={String(label)}>
                  <span className="metric-icon orange">
                    <MetricIcon />
                  </span>
                  <div>
                    <p>{String(label)}</p>
                    <strong>{Number(value)}</strong>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </DataState>
    </main>
  );
}
