import { describe, expect, it } from "vitest";
import type {
  SellerProductivity,
  SellerProductivityMetrics,
} from "../api/reportApi";
import { percentChange, pointChange, teamProductivity } from "./productivity";

const metrics = (
  values: Partial<SellerProductivityMetrics>,
): SellerProductivityMetrics => ({
  workedDays: 0,
  activeHours: 0,
  visits: 0,
  completedVisits: 0,
  contactedCustomers: 0,
  newCustomers: 0,
  completedReminders: 0,
  overdueReminders: 0,
  averageVisitsPerWorkedDay: 0,
  reminderComplianceRate: 0,
  conversionRate: 0,
  closedProjects: 0,
  closedAmount: 0,
  ...values,
});

const seller = (
  current: Partial<SellerProductivityMetrics>,
  previous: Partial<SellerProductivityMetrics> = {},
): SellerProductivity => ({
  sellerExternalId: crypto.randomUUID(),
  sellerName: "Vendedor",
  current: metrics(current),
  previous: metrics(previous),
  variationPercentage: {},
});

describe("teamProductivity", () => {
  it("suma los indicadores del equipo en ambos períodos", () => {
    const team = teamProductivity([
      seller(
        { visits: 10, activeHours: 7.5, workedDays: 2 },
        { visits: 4, activeHours: 3 },
      ),
      seller(
        { visits: 6, activeHours: 4.25, workedDays: 1 },
        { visits: 4, activeHours: 2 },
      ),
    ]);

    expect(team.current.visits).toBe(16);
    expect(team.current.activeHours).toBe(11.75);
    expect(team.current.workedDays).toBe(3);
    expect(team.previous.visits).toBe(8);
    expect(team.previous.activeHours).toBe(5);
  });
});

describe("variaciones", () => {
  it("calcula el cambio porcentual y omite el caso sin base", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 0)).toBeUndefined();
  });

  it("compara las tasas en puntos porcentuales", () => {
    expect(pointChange(32, 28)).toBe(4);
  });
});
