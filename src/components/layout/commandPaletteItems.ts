import type { LucideIcon } from "lucide-react";
import type { NavSection } from "@/components/layout/navigation";

export type PaletteItem = {
  id: string;
  group: "Páginas" | "Contactos";
  label: string;
  hint?: string;
  to: string;
  icon: LucideIcon;
};

export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Flattens the (already permission-filtered) navigation into searchable pages. */
export function paletteItemsFrom(sections: NavSection[]): PaletteItem[] {
  return sections.flatMap((section) =>
    section.entries.flatMap<PaletteItem>((entry) =>
      entry.kind === "link"
        ? [
            {
              id: `page:${entry.to}`,
              group: "Páginas",
              label: entry.label,
              hint: section.label,
              to: entry.to,
              icon: entry.icon,
            },
          ]
        : entry.children.map((child) => ({
            id: `page:${child.to}`,
            group: "Páginas",
            label: child.label,
            hint: entry.label,
            to: child.to,
            icon: entry.icon,
          })),
    ),
  );
}

export function filterPages(items: PaletteItem[], query: string) {
  const term = normalize(query);
  if (!term) return items;
  return items.filter((item) =>
    normalize(`${item.label} ${item.hint ?? ""}`).includes(term),
  );
}

