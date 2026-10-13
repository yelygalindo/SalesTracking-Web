import type {
  SellerProductivity,
  SellerProductivityMetrics,
} from "../api/reportApi";

type Totals = Pick<
  SellerProductivityMetrics,
  | "workedDays"
  | "activeHours"
  | "visits"
  | "contactedCustomers"
  | "newCustomers"
  | "completedReminders"
  | "overdueReminders"
  | "closedProjects"
  | "closedAmount"
> & { conversionRate: number };

const summed: Exclude<keyof Totals, "conversionRate">[] = [
  "workedDays",
  "activeHours",
  "visits",
  "contactedCustomers",
  "newCustomers",
  "completedReminders",
  "overdueReminders",
  "closedProjects",
  "closedAmount",
];

const totalsOf = (metrics: SellerProductivityMetrics[]): Totals => {
  const totals = Object.fromEntries(
    summed.map((key) => [key, metrics.reduce((sum, item) => sum + item[key], 0)]),
  ) as Omit<Totals, "conversionRate">;
  // Same formula as the API: closed projects per contacted customer.
  const conversionRate = totals.contactedCustomers
    ? (totals.closedProjects * 100) / totals.contactedCustomers
    : 0;
  return { ...totals, conversionRate };
};

/** Team totals for the period and the one before it. */
export const teamProductivity = (rows: SellerProductivity[]) => ({
  current: totalsOf(rows.map((row) => row.current)),
  previous: totalsOf(rows.map((row) => row.previous)),
});

/** Percentage change, or undefined when there is nothing to compare with. */
export const percentChange = (current: number, previous: number) =>
  previous === 0 ? undefined : ((current - previous) * 100) / previous;

/** Rates are compared in percentage points, not as a percentage of a percentage. */
export const pointChange = (current: number, previous: number) =>
  current - previous;
