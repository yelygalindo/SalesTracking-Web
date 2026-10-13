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
  it("suma los indicadores y recalcula la conversión del equipo", () => {
    const team = teamProductivity([
      seller(
        { visits: 10, contactedCustomers: 10, closedProjects: 1, closedAmount: 500, conversionRate: 10 },
        { visits: 4, contactedCustomers: 5, closedProjects: 1 },
      ),
      seller(
        { visits: 6, contactedCustomers: 2, closedProjects: 2, closedAmount: 1500, conversionRate: 100 },
        { visits: 4, contactedCustomers: 5, closedProjects: 0 },
      ),
    ]);

    expect(team.current.visits).toBe(16);
    expect(team.current.closedAmount).toBe(2000);
    // 3 closed out of 12 contacted, not the average of 10% and 100%.
    expect(team.current.conversionRate).toBe(25);
    expect(team.previous.visits).toBe(8);
    expect(team.previous.conversionRate).toBe(10);
  });

  it("deja la conversión en cero cuando no hubo contactos", () => {
    expect(teamProductivity([seller({ closedProjects: 2 })]).current.conversionRate).toBe(0);
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
