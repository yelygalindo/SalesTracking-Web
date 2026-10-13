import type { ProjectStatus } from "@/features/projects/api/projectDtos";
import type { ProjectReportItem } from "../api/reportApi";

export interface PipelineColumn {
  statusId: number;
  statusName: string;
  projects: ProjectReportItem[];
  /** Sum of the estimated amounts that were filled in. */
  amount: number;
  /** Projects in the column without an estimated amount. */
  withoutAmount: number;
}

/**
 * Groups projects by status, following the order of the company's statuses. Statuses
 * without projects are kept so the board always shows the whole process.
 */
export function buildPipeline(
  projects: ProjectReportItem[],
  statuses: ProjectStatus[],
): PipelineColumn[] {
  const columns = new Map<number, PipelineColumn>(
    statuses.map((status) => [
      status.value,
      {
        statusId: status.value,
        statusName: status.label,
        projects: [],
        amount: 0,
        withoutAmount: 0,
      },
    ]),
  );
  for (const project of projects) {
    let column = columns.get(project.statusId);
    if (!column) {
      column = {
        statusId: project.statusId,
        statusName: project.statusName,
        projects: [],
        amount: 0,
        withoutAmount: 0,
      };
      columns.set(project.statusId, column);
    }
    column.projects.push(project);
    if (project.estimatedAmount == null) column.withoutAmount += 1;
    else column.amount += project.estimatedAmount;
  }
  for (const column of columns.values())
    column.projects.sort(
      (a, b) => (b.estimatedAmount ?? -1) - (a.estimatedAmount ?? -1),
    );
  return [...columns.values()];
}
