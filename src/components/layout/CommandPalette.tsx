import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ContactRound, CornerDownLeft, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { customerService } from "@/features/customers/services/customerService";
import type { NavSection } from "@/components/layout/navigation";
import {
  filterPages,
  paletteItemsFrom,
  type PaletteItem,
} from "@/components/layout/commandPaletteItems";

export function CommandPalette({
  sections,
  canSearchCustomers,
}: {
  sections: NavSection[];
  canSearchCustomers: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [active, setActive] = useState(0),
    inputRef = useRef<HTMLInputElement>(null),
    listId = useId(),
    navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebounced("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const customers = useQuery({
    queryKey: ["command-palette-customers", debounced],
    queryFn: () =>
      customerService.list({ search: debounced, page: 1, pageSize: 5 }),
    enabled: open && canSearchCustomers && debounced.length >= 2,
    staleTime: 60_000,
  });

  const pages = useMemo(() => paletteItemsFrom(sections), [sections]);
  const results = useMemo<PaletteItem[]>(() => {
    const contactItems =
      debounced.length >= 2
        ? (customers.data?.customers ?? []).map((customer) => ({
            id: `customer:${customer.externalId}`,
            group: "Contactos" as const,
            label: customer.name,
            hint: customer.companyName || customer.email || undefined,
            to: `/customers?selected=${encodeURIComponent(customer.externalId)}`,
            icon: ContactRound,
          }))
        : [];
    return [...filterPages(pages, query).slice(0, 8), ...contactItems];
  }, [pages, query, debounced, customers.data]);

  useEffect(() => setActive(0), [query, results.length]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const searching =
    canSearchCustomers && debounced.length >= 2 && customers.isFetching;

  return (
    <>
      <button
        type="button"
        className="command-trigger"
        onClick={() => setOpen(true)}
        aria-label="Buscar (Ctrl+K)"
      >
        <Search aria-hidden="true" />
        <span>Buscar…</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open &&
        createPortal(
          <div
            className="command-backdrop"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              className="command-palette"
              role="dialog"
              aria-modal="true"
              aria-label="Búsqueda rápida"
            >
              <div className="command-input">
                <Search aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder={
                    canSearchCustomers
                      ? "Busca una página o un contacto…"
                      : "Busca una página…"
                  }
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={
                    results[active] ? `${listId}-${active}` : undefined
                  }
                  aria-autocomplete="list"
                />
                <kbd>Esc</kbd>
              </div>
              <ul className="command-results" id={listId} role="listbox">
                {results.map((item, index) => (
                  <li key={item.id} role="presentation">
                    {(index === 0 || results[index - 1].group !== item.group) && (
                      <p className="command-group" role="presentation">
                        {item.group}
                      </p>
                    )}
                    <button
                      type="button"
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      className={index === active ? "active" : ""}
                      onMouseMove={() => setActive(index)}
                      onClick={() => choose(item)}
                      tabIndex={-1}
                    >
                      <item.icon aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        {item.hint && <small>{item.hint}</small>}
                      </span>
                      {index === active && (
                        <CornerDownLeft className="command-enter" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {!results.length && !searching && (
                <div className="command-empty">
                  <FileText aria-hidden="true" />
                  <p>
                    No encontramos resultados para <strong>“{query}”</strong>.
                  </p>
                </div>
              )}
              {searching && (
                <p className="command-status" role="status">
                  Buscando contactos…
                </p>
              )}
              <footer className="command-footer">
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> navegar
                </span>
                <span>
                  <kbd>Enter</kbd> abrir
                </span>
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
