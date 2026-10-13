import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { customerService } from "@/features/customers/services/customerService";
import { projectService } from "@/features/projects/services/projectService";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import { inSentence } from "@/features/operation-settings/services/operationTerms";
import { formatDate } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import { formatMoney } from "@/lib/i18n/money";
import { reportApi, type ProjectReportItem } from "../api/reportApi";
import { buildPipeline } from "../services/pipeline";

export function ProjectPipelinePage() {
  const { hasRole, can } = useAuthorization();
  const canChooseSeller = !hasRole("seller") && can("sellers.read");
  const canOpenProjects = can("projects.read");
  const {
    labels: { project: term },
  } = useOperationTerms();
  const plural = inSentence(term.plural);
  const [params, setParams] = useSearchParams();
  const sellerId = canChooseSeller ? (params.get("seller") ?? "") : "";
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: canChooseSeller,
  });
  // The board still works from the report's own status names if this is not readable.
  const statuses = useQuery({
    queryKey: ["project-statuses"],
    queryFn: projectService.statuses,
    enabled: canOpenProjects,
  });
  const report = useQuery({
    queryKey: ["project-pipeline", sellerId],
    queryFn: () => reportApi.projects({ sellerId }),
  });
  const columns = useMemo(
    () => buildPipeline(report.data ?? [], statuses.data ?? []),
    [report.data, statuses.data],
  );
  const projects = report.data ?? [];
  const totalAmount = columns.reduce((sum, column) => sum + column.amount, 0);
  const withoutAmount = columns.reduce(
    (sum, column) => sum + column.withoutAmount,
    0,
  );

  return (
    <main className="customers-content reports-page pipeline-page">
      <PageHeader
        eyebrow="Análisis"
        title={`Embudo de ${plural}`}
        description={`Cuánto negocio gestiona el equipo y en qué etapa está cada ${inSentence(term.singular)}.`}
      />
      {canChooseSeller && (
        <section className="report-filters" aria-label="Filtros del reporte">
          <label>
            Responsable
            <select
              value={sellerId}
              onChange={(event) =>
                setParams(
                  event.target.value ? { seller: event.target.value } : {},
                  { replace: true },
                )
              }
            >
              <option value="">Todo el equipo</option>
              {sellers.data?.map((seller) => (
                <option key={seller.externalId} value={seller.externalId}>
                  {seller.displayName}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      <DataState
        loading={report.isLoading}
        error={report.error}
        onRetry={report.refetch}
        isEmpty={!projects.length}
        empty={`No hay ${plural} para los filtros seleccionados.`}
      >
        <section className="report-summary" aria-label="Resumen del embudo">
          <article>
            <span>{term.plural}</span>
            <strong>{projects.length}</strong>
          </article>
          <article>
            <span>Monto estimado total</span>
            <strong>{formatMoney(totalAmount)}</strong>
          </article>
          {withoutAmount > 0 && (
            <article>
              <span>Sin monto estimado</span>
              <strong>{withoutAmount}</strong>
            </article>
          )}
        </section>
        <div className="pipeline-board" aria-label={`${term.plural} por estado`}>
          {columns.map((column) => (
            <section
              className="pipeline-column"
              key={column.statusId}
              aria-labelledby={`pipeline-status-${column.statusId}`}
            >
              <header>
                <h2 id={`pipeline-status-${column.statusId}`}>
                  {translateValue(column.statusName)}
                  <span className="project-tab-count">
                    {column.projects.length}
                  </span>
                </h2>
                <strong>{formatMoney(column.amount)}</strong>
                {column.withoutAmount > 0 && (
                  <small>{column.withoutAmount} sin monto</small>
                )}
              </header>
              {column.projects.length ? (
                <ul>
                  {column.projects.map((project) => (
                    <PipelineCard
                      key={project.projectExternalId}
                      project={project}
                      canOpen={canOpenProjects}
                    />
                  ))}
                </ul>
              ) : (
                <p className="pipeline-empty">Sin {plural} en esta etapa.</p>
              )}
            </section>
          ))}
        </div>
      </DataState>
    </main>
  );
}

function PipelineCard({
  project,
  canOpen,
}: {
  project: ProjectReportItem;
  canOpen: boolean;
}) {
  const overdue =
    !project.actualCloseDateUtc &&
    project.expectedCloseDateUtc != null &&
    new Date(project.expectedCloseDateUtc).getTime() < Date.now();
  return (
    <li className="pipeline-card">
      {canOpen ? (
        <Link
          to={`/projects?selected=${encodeURIComponent(project.projectExternalId)}`}
        >
          {project.name}
        </Link>
      ) : (
        <strong>{project.name}</strong>
      )}
      <span>{project.customerName || "Sin cliente"}</span>
      <span className="pipeline-card-amount">
        {project.estimatedAmount != null
          ? formatMoney(project.estimatedAmount)
          : "Sin monto estimado"}
      </span>
      <progress
        max="100"
        value={project.progressPercentage}
        aria-label={`Avance ${project.progressPercentage}%`}
      />
      <footer>
        <span>{project.sellerName}</span>
        {(project.actualCloseDateUtc || project.expectedCloseDateUtc) && (
          <span className={overdue ? "pipeline-overdue" : undefined}>
            <CalendarClock aria-hidden="true" />
            {project.actualCloseDateUtc
              ? `Cerrado ${formatDate(project.actualCloseDateUtc)}`
              : `${overdue ? "Cierre vencido" : "Cierre"} ${formatDate(project.expectedCloseDateUtc)}`}
          </span>
        )}
      </footer>
    </li>
  );
}
