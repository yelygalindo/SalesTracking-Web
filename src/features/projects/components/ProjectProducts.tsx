import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { projectService } from "../services/projectService";

export function ProjectProducts({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["project-materials", id],
    queryFn: () => projectService.materials(id),
  });
  return (
    <section className="project-products">
      <header>
        <p className="overline">Entrega asociada</p>
        <h3>Productos comprometidos</h3>
      </header>
      {query.data?.map((item) => (
        <article key={item.productExternalId}>
          <Package />
          <div>
            <strong>{item.productName}</strong>
            <dl>
              <div>
                <dt>Cantidad</dt>
                <dd>{item.committedQuantity}</dd>
              </div>
              <div>
                <dt>Unidad</dt>
                <dd>{item.unit}</dd>
              </div>
              <div>
                <dt>Entregado</dt>
                <dd>{item.deliveredQuantity}</dd>
              </div>
              <div>
                <dt>Pendiente</dt>
                <dd>{item.pendingQuantity}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}
      {!query.isLoading && !query.data?.length && (
        <p className="activity-empty">
          Este seguimiento no tiene entregas asociadas.
        </p>
      )}
      {query.isLoading && <p className="activity-empty">Cargando productos…</p>}
      {query.isError && (
        <p className="form-error">
          No fue posible cargar la información de la entrega.
        </p>
      )}
    </section>
  );
}
