type PageItem = number | "ellipsis-start" | "ellipsis-end";

const pageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push("ellipsis-start");
  for (let current = start; current <= end; current += 1)
    pages.push(current);
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);

  return pages;
};

export function Pagination({
  page,
  pageSize = 20,
  totalPages,
  totalItems,
  itemLabel = "registros",
  onChange,
}: {
  page: number;
  pageSize?: number;
  totalPages: number;
  totalItems?: number;
  itemLabel?: string;
  onChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem =
    totalItems == null
      ? page * pageSize
      : Math.min(page * pageSize, totalItems);

  return (
    <footer className="pagination">
      <span>
        {totalItems == null
          ? `Página ${page} de ${totalPages}`
          : `Mostrando ${firstItem}–${lastItem} de ${totalItems.toLocaleString("es-BO")} ${itemLabel}`}
      </span>
      {totalPages > 1 && (
        <nav aria-label="Paginación">
          <button
            className="pagination-direction"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            Anterior
          </button>
          <div className="pagination-pages">
            {pageItems(page, totalPages).map((item) =>
              typeof item === "number" ? (
                <button
                  className={item === page ? "active" : ""}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Página ${item}`}
                  key={item}
                  onClick={() => onChange(item)}
                >
                  {item}
                </button>
              ) : (
                <span aria-hidden="true" key={item}>
                  …
                </span>
              ),
            )}
          </div>
          <button
            className="pagination-direction"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </footer>
  );
}
