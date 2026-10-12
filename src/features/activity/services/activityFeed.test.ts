import { describe, expect, it } from "vitest";
import { asUtc } from "../api/activityApi";
import type { ActivityItem } from "../api/activityApi";
import { dayLabel, describeActivity, groupByDay, relatedLink } from "./activityFeed";

const item = (overrides: Partial<ActivityItem>): ActivityItem => ({
  externalId: "a1",
  eventType: "Visit",
  resourceType: "visit",
  resourceExternalId: "c1",
  title: "Visita registrada",
  occurredAtUtc: "2026-10-12T15:00:00Z",
  relatedEntityType: "customer",
  relatedEntityName: "Ferretería El Sol",
  ...overrides,
});

describe("asUtc", () => {
  it("marca como UTC las fechas sin zona y respeta las que ya la tienen", () => {
    expect(asUtc("2026-10-12T15:00:00")).toBe("2026-10-12T15:00:00Z");
    expect(asUtc("2026-10-12T15:00:00Z")).toBe("2026-10-12T15:00:00Z");
    expect(asUtc("2026-10-12T15:00:00-04:00")).toBe("2026-10-12T15:00:00-04:00");
  });
});

describe("describeActivity", () => {
  it("traduce los eventos de jornadas, visitas y entregas", () => {
    expect(describeActivity({ eventType: "WorkdayStarted", resourceType: "workday" }).label).toBe("Jornada iniciada");
    expect(describeActivity({ eventType: "VisitEnded", resourceType: "visit" }).label).toBe("Visita finalizada");
    expect(describeActivity({ eventType: "Visit", resourceType: "visit" }).label).toBe("Visita iniciada");
    expect(describeActivity({ eventType: "DeliveryReceived", resourceType: "project" }).label).toBe("Entrega");
    expect(describeActivity({ eventType: "CustomerReminderCompleted", resourceType: "customer" }).label).toBe("Recordatorio completado");
  });
});

describe("relatedLink", () => {
  it("enlaza contactos y omite entidades sin pantalla de detalle", () => {
    expect(relatedLink(item({}))).toBe("/customers?selected=c1");
    expect(relatedLink(item({ relatedEntityType: "project" }))).toBeUndefined();
    expect(relatedLink(item({ resourceExternalId: null }))).toBeUndefined();
  });
});

describe("groupByDay", () => {
  it("agrupa por día manteniendo el orden", () => {
    const days = groupByDay([
      item({ externalId: "1", occurredAtUtc: "2026-10-12T18:00:00Z" }),
      item({ externalId: "2", occurredAtUtc: "2026-10-12T14:00:00Z" }),
      item({ externalId: "3", occurredAtUtc: "2026-10-10T14:00:00Z" }),
    ]);
    expect(days.map((day) => day.items.map((entry) => entry.externalId))).toEqual([["1", "2"], ["3"]]);
  });

  it("nombra hoy, ayer y los demás días", () => {
    const today = new Date("2026-10-12T16:00:00Z");
    const days = groupByDay([item({ occurredAtUtc: today.toISOString() })]);
    expect(dayLabel(days[0].key, today)).toBe("Hoy");
    expect(dayLabel("2026-10-05", today)).toMatch(/^Lunes, 5 de octubre|^Lunes 5 de octubre/);
  });
});
