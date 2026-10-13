import { describe, expect, it } from "vitest";
import type { ProjectReportItem } from "../api/reportApi";
import { buildPipeline } from "./pipeline";

const project = (
  values: Partial<ProjectReportItem> & Pick<ProjectReportItem, "statusId">,
): ProjectReportItem => ({
  projectExternalId: crypto.randomUUID(),
  name: "Obra",
  sellerExternalId: "seller-1",
  sellerName: "Ana",
  statusName: "Estado",
  progressPercentage: 0,
  createdAtUtc: "2026-01-01T00:00:00Z",
  ...values,
});

describe("buildPipeline", () => {
  it("agrupa por estado en el orden de la empresa y conserva etapas vacías", () => {
    const columns = buildPipeline(
      [
        project({ statusId: 3, estimatedAmount: 100 }),
        project({ statusId: 1, estimatedAmount: 200 }),
        project({ statusId: 1, estimatedAmount: null }),
        project({ statusId: 1, estimatedAmount: 900 }),
      ],
      [
        { value: 1, label: "En gestión" },
        { value: 2, label: "Negociación" },
        { value: 3, label: "Cerrado" },
      ],
    );

    expect(columns.map((column) => column.statusName)).toEqual([
      "En gestión",
      "Negociación",
      "Cerrado",
    ]);
    expect(columns[0].amount).toBe(1100);
    expect(columns[0].withoutAmount).toBe(1);
    expect(columns[0].projects.map((item) => item.estimatedAmount)).toEqual([
      900,
      200,
      null,
    ]);
    expect(columns[1].projects).toHaveLength(0);
  });

  it("agrega al final los estados que no están en el catálogo", () => {
    const columns = buildPipeline(
      [project({ statusId: 9, statusName: "Pausado", estimatedAmount: 50 })],
      [{ value: 1, label: "En gestión" }],
    );

    expect(columns.map((column) => column.statusName)).toEqual([
      "En gestión",
      "Pausado",
    ]);
  });
});
