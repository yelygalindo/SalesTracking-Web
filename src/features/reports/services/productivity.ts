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
>;

const summed: (keyof Totals)[] = [
  "workedDays",
  "activeHours",
  "visits",
  "contactedCustomers",
  "newCustomers",
  "completedReminders",
  "overdueReminders",
  "closedProjects",
];

const totalsOf = (metrics: SellerProductivityMetrics[]): Totals =>
  Object.fromEntries(
    summed.map((key) => [key, metrics.reduce((sum, item) => sum + item[key], 0)]),
  ) as Totals;

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
