import {
  BellPlus,
  Building2,
  CheckCircle2,
  ContactRound,
  FileText,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  RefreshCw,
  Route,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { localDayKey } from "@/lib/i18n/dateTime";
import type { ActivityItem, ActivityType } from "../api/activityApi";

export const activityTypeFilters: { value: ActivityType | ""; label: string }[] = [
  { value: "", label: "Todo" },
  { value: "workday", label: "Jornadas" },
  { value: "visit", label: "Visitas" },
  { value: "project", label: "Seguimientos" },
  { value: "customer", label: "Contactos" },
  { value: "delivery", label: "Entregas" },
  { value: "reminder", label: "Recordatorios" },
  { value: "note", label: "Notas" },
];

export const isActivityType = (value: string): value is ActivityType =>
  activityTypeFilters.some((filter) => filter.value === value && value !== "");

export type ActivityTone = "blue" | "green" | "orange" | "slate";

export interface ActivityVisual {
  label: string;
  Icon: LucideIcon;
  tone: ActivityTone;
}

const compact = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();

/** Icon, color and a Spanish label for each event the feed can return. */
export function describeActivity(item: Pick<ActivityItem, "eventType" | "resourceType">): ActivityVisual {
  const event = compact(item.eventType);
  if (event === "workdaystarted") return { label: "Jornada iniciada", Icon: LogIn, tone: "green" };
  if (event === "workdayended") return { label: "Jornada finalizada", Icon: LogOut, tone: "slate" };
  if (event === "visitended" || event.includes("checkout"))
    return { label: "Visita finalizada", Icon: Route, tone: "green" };
  if (event === "visit" || event.includes("checkin"))
    return { label: "Visita iniciada", Icon: MapPin, tone: "orange" };
  if (event.startsWith("delivery")) return { label: "Entrega", Icon: Truck, tone: "blue" };
  if (event.includes("reminder") && event.includes("complet"))
    return { label: "Recordatorio completado", Icon: CheckCircle2, tone: "green" };
  if (event.includes("reminder")) return { label: "Recordatorio", Icon: BellPlus, tone: "orange" };
  if (event.includes("note")) return { label: "Nota", Icon: Pencil, tone: "blue" };
  if (event.includes("attachment") || event.includes("file"))
    return { label: "Archivo agregado", Icon: FileText, tone: "blue" };
  if (event.includes("status")) return { label: "Cambio de estado", Icon: RefreshCw, tone: "blue" };
  if (compact(item.resourceType) === "customer")
    return { label: "Contacto", Icon: ContactRound, tone: "blue" };
  return { label: "Seguimiento", Icon: Building2, tone: "blue" };
}

/** Link to the related record when the web has a screen that can open it. */
export function relatedLink(item: ActivityItem) {
  if (!item.resourceExternalId) return undefined;
  const related = compact(item.relatedEntityType ?? item.resourceType);
  if (related === "customer")
    return `/customers?selected=${encodeURIComponent(item.resourceExternalId)}`;
  return undefined;
}

export interface ActivityDay {
  key: string;
  items: ActivityItem[];
}

/** Groups a newest-first feed by calendar day in the company time zone. */
export function groupByDay(items: ActivityItem[]): ActivityDay[] {
  const days: ActivityDay[] = [];
  for (const item of items) {
    const key = localDayKey(item.occurredAtUtc);
    const current = days.at(-1);
    if (current?.key === key) current.items.push(item);
    else days.push({ key, items: [item] });
  }
  return days;
}

export function dayLabel(key: string, today = new Date()) {
  const todayKey = localDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === todayKey) return "Hoy";
  if (key === localDayKey(yesterday)) return "Ayer";
  const label = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${key}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
