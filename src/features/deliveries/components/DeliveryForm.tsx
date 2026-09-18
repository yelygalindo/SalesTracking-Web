import type { FormEvent } from "react";
import { ClipboardList, PackageCheck, Plus, X } from "lucide-react";
import { AppError } from "@/lib/api/apiError";
import type { Input } from "../api/deliveryApi";

const message = (error: unknown) => error instanceof AppError ? error.message : error instanceof Error ? error.message : "No fue posible completar la operación.";

export function DeliveryForm({
  form,
  setForm,
  projects,
  products,
  submit,
  error,
  busy,
}: {
  form: Input;
  setForm: (input: Input) => void;
  projects: { externalId: string; name: string }[];
  products: { externalId: string; name: string }[];
  submit: (event: FormEvent) => void;
  error: unknown;
  busy: boolean;
}) {
  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { productExternalId: "", quantity: 1 }],
    });

  return (
    <form className="delivery-form" onSubmit={submit}>
      <section className="delivery-form-section">
        <header>
          <ClipboardList />
          <div>
            <h2>Información de la entrega</h2>
            <p>Datos del compromiso y observaciones para el equipo.</p>
          </div>
        </header>
        <div className="delivery-form-grid">
          <label>
            Proyecto *
            <select
              required
              value={form.projectExternalId}
              onChange={(event) =>
                setForm({ ...form, projectExternalId: event.target.value })
              }
            >
              <option value="">Seleccionar proyecto</option>
              {projects.map((project) => (
                <option key={project.externalId} value={project.externalId}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha comprometida *
            <input
              required
              type="datetime-local"
              value={form.committedDateUtc}
              onChange={(event) =>
                setForm({ ...form, committedDateUtc: event.target.value })
              }
            />
          </label>
          <label className="full-width">
            Notas
            <textarea
              rows={3}
              value={form.notes || ""}
              placeholder="Indicaciones, condiciones o referencias de la entrega"
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
        </div>
      </section>
      <section className="delivery-form-section delivery-products-editor">
        <header>
          <PackageCheck />
          <div>
            <h2>Productos comprometidos</h2>
            <p>Agrega al menos un producto y su cantidad.</p>
          </div>
          <button type="button" className="secondary-action" onClick={addItem}>
            <Plus /> Agregar producto
          </button>
        </header>
        {!form.items.length ? (
          <div className="delivery-items-empty">
            Aún no agregaste productos a esta entrega.
          </div>
        ) : (
          <div className="delivery-items-editor">
            {form.items.map((item, index) => (
              <div className="delivery-item" key={index}>
                <label>
                  Producto
                  <select
                    required
                    value={item.productExternalId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((current, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...current,
                                productExternalId: event.target.value,
                              }
                            : current,
                        ),
                      })
                    }
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((product) => (
                      <option key={product.externalId} value={product.externalId}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((current, itemIndex) =>
                          itemIndex === index
                            ? { ...current, quantity: Number(event.target.value) }
                            : current,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Quitar producto ${index + 1}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {Boolean(error) && <p className="form-error">{message(error)}</p>}
      <footer className="delivery-form-actions">
        <button className="action-primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar entrega"}
        </button>
      </footer>
    </form>
  );
}

