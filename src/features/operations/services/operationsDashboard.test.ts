import { describe, expect, it } from "vitest";
import type {
  ActiveSeller,
  OperationVisit,
  SellerOption,
  Workday,
} from "../api/operationsApi";
import { buildOperationsDashboard } from "./operationsDashboard";

const sellers: SellerOption[] = [
  { externalId: "seller-1", displayName: "Ana Pérez" },
  { externalId: "seller-2", displayName: "Luis Rojas" },
  { externalId: "seller-3", displayName: "Marta Flores" },
];
const workdays: Workday[] = [
  {
    id: "workday-1",
    sellerExternalId: "seller-1",
    sellerName: "Ana Pérez",
    status: "open",
    startedAtUtc: "2026-10-09T12:00:00Z",
    visitCount: 1,
    locationCount: 2,
  },
  {
    id: "workday-2",
    sellerExternalId: "seller-2",
    sellerName: "Luis Rojas",
    status: "closed",
    startedAtUtc: "2026-10-09T11:00:00Z",
    endedAtUtc: "2026-10-09T17:00:00Z",
    visitCount: 1,
    locationCount: 4,
  },
];

describe("buildOperationsDashboard", () => {
  it("clasifica trabajadores, jornadas finalizadas y visitas completadas", () => {
    const active: ActiveSeller[] = [
      {
        sellerExternalId: "seller-1",
        sellerName: "Ana Pérez",
        startedAtUtc: "2026-10-09T12:00:00Z",
        lastUpdatedAtUtc: "2026-10-09T17:50:00Z",
        lastLocation: {
          capturedAtUtc: "2026-10-09T17:50:00Z",
          latitude: -17.39,
          longitude: -66.15,
        },
      },
    ];
    const visits: OperationVisit[] = [
      {
        externalId: "visit-1",
        sellerExternalId: "seller-1",
        visitedAtUtc: "2026-10-09T15:00:00Z",
        checkOutAtUtc: "2026-10-09T16:00:00Z",
      },
      {
        externalId: "visit-2",
        sellerExternalId: "seller-1",
        visitedAtUtc: "2026-10-09T17:30:00Z",
      },
    ];

    const result = buildOperationsDashboard(
      sellers,
      active,
      workdays,
      visits,
      new Date("2026-10-09T18:00:00Z"),
    );

    expect(result.metrics).toEqual({
      working: 1,
      finished: 1,
      completedVisits: 1,
      incidents: 0,
    });
    expect(result.workers.find((worker) => worker.sellerExternalId === "seller-3")?.status).toBe("not-started");
  });

  it("marca como incidencia una jornada sin señal durante más de 30 minutos", () => {
    const active: ActiveSeller[] = [
      {
        sellerExternalId: "seller-1",
        sellerName: "Ana Pérez",
        startedAtUtc: "2026-10-09T12:00:00Z",
        lastUpdatedAtUtc: "2026-10-09T16:45:00Z",
        lastLocation: {
          capturedAtUtc: "2026-10-09T16:45:00Z",
          latitude: -17.39,
          longitude: -66.15,
        },
      },
    ];

    const result = buildOperationsDashboard(
      sellers,
      active,
      workdays,
      [],
      new Date("2026-10-09T18:00:00Z"),
    );

    expect(result.metrics.incidents).toBe(1);
    expect(result.workers[0].incident).toBe("Sin señal hace 75 min");
  });
});
