import type {
  ActiveSeller,
  OperationVisit,
  SellerOption,
  Workday,
} from "../api/operationsApi";

export type WorkerOperationStatus = "working" | "finished" | "not-started";

export interface OperationsWorker {
  sellerExternalId: string;
  sellerName: string;
  status: WorkerOperationStatus;
  workday?: Workday;
  startedAtUtc?: string | null;
  endedAtUtc?: string | null;
  lastLocationAtUtc?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  completedVisits: number;
  incident?: string;
}

export interface OperationsDashboardData {
  workers: OperationsWorker[];
  metrics: {
    working: number;
    finished: number;
    completedVisits: number;
    incidents: number;
  };
}

const statusPriority: Record<WorkerOperationStatus, number> = {
  working: 0,
  finished: 1,
  "not-started": 2,
};

const latestFirst = (left: Workday, right: Workday) =>
  right.startedAtUtc.localeCompare(left.startedAtUtc);

export function buildOperationsDashboard(
  sellers: SellerOption[],
  activeSellers: ActiveSeller[],
  workdays: Workday[],
  visits: OperationVisit[],
  now = new Date(),
): OperationsDashboardData {
  const activeBySeller = new Map(
    activeSellers.map((seller) => [seller.sellerExternalId, seller]),
  );
  const workdayById = new Map(workdays.map((workday) => [workday.id, workday]));
  const workdaysBySeller = new Map<string, Workday[]>();
  for (const workday of workdays) {
    if (!workday.sellerExternalId) continue;
    const current = workdaysBySeller.get(workday.sellerExternalId) ?? [];
    current.push(workday);
    workdaysBySeller.set(workday.sellerExternalId, current);
  }
  for (const sellerWorkdays of workdaysBySeller.values())
    sellerWorkdays.sort(latestFirst);

  const completedVisitsBySeller = new Map<string, number>();
  for (const visit of visits) {
    if (!visit.sellerExternalId || !visit.checkOutAtUtc) continue;
    completedVisitsBySeller.set(
      visit.sellerExternalId,
      (completedVisitsBySeller.get(visit.sellerExternalId) ?? 0) + 1,
    );
  }

  const sellerDirectory = new Map(
    sellers.map((seller) => [
      seller.externalId,
      { externalId: seller.externalId, displayName: seller.displayName },
    ]),
  );
  for (const active of activeSellers)
    sellerDirectory.set(active.sellerExternalId, {
      externalId: active.sellerExternalId,
      displayName:
        active.sellerName ||
        sellerDirectory.get(active.sellerExternalId)?.displayName ||
        "Responsable",
    });
  for (const workday of workdays)
    if (workday.sellerExternalId)
      sellerDirectory.set(workday.sellerExternalId, {
        externalId: workday.sellerExternalId,
        displayName:
          workday.sellerName ||
          sellerDirectory.get(workday.sellerExternalId)?.displayName ||
          "Responsable",
      });
  for (const visit of visits)
    if (visit.sellerExternalId)
      sellerDirectory.set(visit.sellerExternalId, {
        externalId: visit.sellerExternalId,
        displayName:
          visit.sellerName ||
          sellerDirectory.get(visit.sellerExternalId)?.displayName ||
          "Responsable",
      });

  const staleAfterMilliseconds = 30 * 60 * 1000;
  const workers = [...sellerDirectory.values()].map<OperationsWorker>(
    (seller) => {
      const active = activeBySeller.get(seller.externalId);
      const sellerWorkdays = workdaysBySeller.get(seller.externalId) ?? [];
      const openWorkday = sellerWorkdays.find((item) =>
        ["open", "active"].includes(item.status.toLowerCase()),
      );
      const activeWorkday = active?.workdayExternalId
        ? workdayById.get(active.workdayExternalId)
        : undefined;
      const workday = activeWorkday ?? openWorkday ?? sellerWorkdays[0];
      const isWorking = Boolean(active || openWorkday);
      const isFinished = !isWorking && Boolean(workday?.endedAtUtc);
      const lastLocation = active?.lastLocation;
      const lastLocationAtUtc =
        active?.lastUpdatedAtUtc ?? lastLocation?.capturedAtUtc ?? null;
      let incident: string | undefined;

      if (isWorking && !lastLocation) incident = "Sin ubicación reportada";
      else if (isWorking && lastLocationAtUtc) {
        const elapsed = now.getTime() - new Date(lastLocationAtUtc).getTime();
        if (elapsed > staleAfterMilliseconds) {
          const minutes = Math.max(31, Math.floor(elapsed / 60000));
          incident = `Sin señal hace ${minutes} min`;
        }
      }

      return {
        sellerExternalId: seller.externalId,
        sellerName: seller.displayName,
        status: isWorking ? "working" : isFinished ? "finished" : "not-started",
        workday:
          workday ??
          (active?.workdayExternalId
            ? {
                id: active.workdayExternalId,
                sellerExternalId: seller.externalId,
                sellerName: seller.displayName,
                status: active.status || "open",
                startedAtUtc: active.startedAtUtc,
                visitCount: completedVisitsBySeller.get(seller.externalId) ?? 0,
                locationCount: active.lastLocation ? 1 : 0,
              }
            : undefined),
        startedAtUtc: active?.startedAtUtc ?? workday?.startedAtUtc,
        endedAtUtc: workday?.endedAtUtc,
        lastLocationAtUtc,
        latitude: lastLocation?.latitude,
        longitude: lastLocation?.longitude,
        completedVisits: completedVisitsBySeller.get(seller.externalId) ?? 0,
        incident,
      };
    },
  );

  workers.sort(
    (left, right) =>
      Number(Boolean(right.incident)) - Number(Boolean(left.incident)) ||
      statusPriority[left.status] - statusPriority[right.status] ||
      left.sellerName.localeCompare(right.sellerName, "es"),
  );

  return {
    workers,
    metrics: {
      working: workers.filter((worker) => worker.status === "working").length,
      finished: workers.filter((worker) => worker.status === "finished").length,
      completedVisits: visits.filter((visit) => Boolean(visit.checkOutAtUtc))
        .length,
      incidents: workers.filter((worker) => Boolean(worker.incident)).length,
    },
  };
}
