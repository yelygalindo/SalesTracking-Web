export const supportCategories = [
  { value: "technical", label: "Problema técnico" },
  { value: "usage", label: "Duda de uso" },
  { value: "access", label: "Cuenta y accesos" },
  { value: "suggestion", label: "Sugerencia" },
] as const;

export type SupportCategory = (typeof supportCategories)[number]["value"];

export interface SupportContext {
  userName: string;
  userEmail: string;
  company: string;
  roles: string[];
  page?: string;
  browser: string;
  sentAt: string;
}

export interface SupportRequest {
  category: SupportCategory;
  subject: string;
  message: string;
  context?: SupportContext;
}

/** Long mailto links get truncated by some mail clients, so the message is capped. */
export const maxMessageLength = 1500;

const categoryLabel = (category: SupportCategory) =>
  supportCategories.find((item) => item.value === category)?.label ?? "Consulta";

export function buildSupportMail(request: SupportRequest) {
  const subject = `[UrbanTrack · ${categoryLabel(request.category)}] ${request.subject.trim()}`;
  const lines = [request.message.trim().slice(0, maxMessageLength)];
  const { context } = request;
  if (context)
    lines.push(
      "",
      "— Datos para el equipo de soporte —",
      `Usuario: ${context.userName} (${context.userEmail})`,
      `Empresa: ${context.company}`,
      `Rol: ${context.roles.join(", ") || "—"}`,
      `Página: ${context.page || "—"}`,
      `Navegador: ${context.browser}`,
      `Fecha: ${context.sentAt}`,
    );
  const body = lines.join("\n");
  return { subject, body };
}

export function supportMailHref(to: string, mail: { subject: string; body: string }) {
  const query = new URLSearchParams({ subject: mail.subject, body: mail.body })
    .toString()
    // mailto clients expect %20 for spaces, not "+".
    .replaceAll("+", "%20");
  return `mailto:${to}?${query}`;
}

/** Text to paste in a webmail when no desktop mail client opens. */
export const supportMailText = (to: string, mail: { subject: string; body: string }) =>
  `Para: ${to}\nAsunto: ${mail.subject}\n\n${mail.body}`;

/** Short, readable browser and OS name, e.g. "Chrome 140 en Windows". */
export function describeBrowser(userAgent: string) {
  const browsers: [string, RegExp][] = [
    ["Edge", /Edg\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Firefox", /Firefox\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ];
  const systems: [string, RegExp][] = [
    ["Android", /Android/],
    ["iOS", /iPhone|iPad|iPod/],
    ["Windows", /Windows/],
    ["macOS", /Mac OS X/],
    ["Linux", /Linux/],
  ];
  const browser = browsers
    .map(([name, pattern]) => {
      const match = userAgent.match(pattern);
      return match ? `${name} ${match[1]}` : null;
    })
    .find(Boolean);
  const system = systems.find(([, pattern]) => pattern.test(userAgent))?.[0];
  if (!browser) return userAgent.slice(0, 120) || "Desconocido";
  return system ? `${browser} en ${system}` : browser;
}
