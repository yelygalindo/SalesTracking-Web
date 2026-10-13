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
        hasOpenWorkday: true,
        sellerName: "Ana Pérez",
        startedAtUtc: "2026-10-09T12:00:00Z",
        lastUpdatedAtUtc: "2026-10-09T17:50:00Z",
        lastLocation: {
          capturedAtUtc: "2026-10-09T17:50:00Z",
          latitude: -17.39,
          longitude: -66.15,
        },
        currentVisit: {
          name: "Clínica Central",
          startedAtUtc: "2026-10-09T17:30:00Z",
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
    expect(
      result.workers.find((worker) => worker.sellerExternalId === "seller-3")
        ?.status,
    ).toBe("not-started");
    expect(
      result.workers.find((worker) => worker.sellerExternalId === "seller-1")
        ?.currentVisitName,
    ).toBe("Clínica Central");
  });

  it("marca como incidencia una jornada sin señal durante más de 30 minutos", () => {
    const active: ActiveSeller[] = [
      {
        sellerExternalId: "seller-1",
        hasOpenWorkday: true,
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

  it("marca como incidencia el error de seguimiento que reportó el celular", () => {
    const active: ActiveSeller[] = [
      {
        sellerExternalId: "seller-1",
        hasOpenWorkday: true,
        sellerName: "Ana Pérez",
        startedAtUtc: "2026-10-09T12:00:00Z",
        lastUpdatedAtUtc: "2026-10-09T17:55:00Z",
        lastLocation: {
          capturedAtUtc: "2026-10-09T17:55:00Z",
          latitude: -17.39,
          longitude: -66.15,
        },
        trackingHealth: {
          installationId: "phone-123",
          isError: true,
          message: "Permiso de ubicación denegado",
          occurredAtUtc: "2026-10-09T17:56:00Z",
          receivedAtUtc: "2026-10-09T17:56:01Z",
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

    const ana = result.workers.find((worker) => worker.sellerExternalId === "seller-1");
    expect(ana?.incident).toBe("Error en el celular: Permiso de ubicación denegado");
    expect(ana?.trackingHealth?.installationId).toBe("phone-123");
  });

  it("conserva el estado del celular de quien no está trabajando sin marcar incidencia", () => {
    const active: ActiveSeller[] = [
      {
        sellerExternalId: "seller-3",
        hasOpenWorkday: false,
        sellerName: "Marta Flores",
        startedAtUtc: "",
        trackingHealth: {
          installationId: "phone-9",
          isError: true,
          message: "Upload response: 500",
          occurredAtUtc: "2026-10-09T09:00:00Z",
          receivedAtUtc: "2026-10-09T09:00:02Z",
        },
      },
    ];

    const result = buildOperationsDashboard(sellers, active, workdays, [], new Date("2026-10-09T18:00:00Z"));

    const marta = result.workers.find((worker) => worker.sellerExternalId === "seller-3");
    expect(marta?.status).toBe("not-started");
    expect(marta?.incident).toBeUndefined();
    expect(marta?.trackingHealth?.isError).toBe(true);
  });
});

describe("trabajadores activos sin jornada", () => {
  it("no cuenta como trabajando a quien no abrió jornada y conserva su nombre", async () => {
    const { normalizeActiveSeller } = await import("../api/operationsApi");
    const active = [
      normalizeActiveSeller({
        sellerExternalId: "seller-9",
        sellerName: "Carla Nueva",
        hasOpenWorkday: false,
        workdayExternalId: "",
        startedAtUtc: "0001-01-01T00:00:00",
        workdayStartedAtUtc: null,
      }),
    ];

    const result = buildOperationsDashboard([], active, [], []);

    expect(result.metrics.working).toBe(0);
    expect(result.workers).toEqual([
      expect.objectContaining({
        sellerName: "Carla Nueva",
        status: "not-started",
        incident: undefined,
      }),
    ]);
  });

  it("usa el nombre del lugar y el inicio de la visita en curso", async () => {
    const { normalizeActiveSeller } = await import("../api/operationsApi");
    const seller = normalizeActiveSeller({
      sellerExternalId: "seller-1",
      sellerName: "Ana Pérez",
      hasOpenWorkday: true,
      workdayExternalId: "wd-1",
      startedAtUtc: "2026-10-09T12:00:00Z",
      workdayStartedAtUtc: "2026-10-09T12:00:00Z",
      currentVisitExternalId: "visit-7",
      currentVisitTargetName: "Obra Torre Norte",
      currentVisitStartedAtUtc: "2026-10-09T15:00:00Z",
    });

    expect(seller.currentVisit).toEqual({
      name: "Obra Torre Norte",
      startedAtUtc: "2026-10-09T15:00:00Z",
    });
    const [worker] = buildOperationsDashboard([], [seller], [], []).workers;
    expect(worker.status).toBe("working");
    expect(worker.currentVisitName).toBe("Obra Torre Norte");
  });
});
