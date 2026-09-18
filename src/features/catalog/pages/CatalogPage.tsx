import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import {
  productsApi,
  unitsApi,
  type Product,
  type ProductInput,
  type Unit,
  type UnitInput,
} from "../api/catalogApi";

const emptyUnit: UnitInput = {
  name: "",
  symbol: "",
  description: null,
  allowsDecimals: false,
  isActive: true,
};
const emptyProduct: ProductInput = {
  name: "",
  description: null,
  externalUnitId: "",
  price: 0,
  isActive: true,
};

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth(),
    cache = useQueryClient();
  const isSeller =
    user?.roles.some((role) => role.toLowerCase() === "seller") ?? false;
  const canCreateProduct = usePermission("products.create"),
    canUpdateProduct = usePermission("products.update"),
    canDeleteProduct = usePermission("products.delete");
  const hasUnitsRead = usePermission("units.read"),
    canCreateUnit = usePermission("units.create"),
    canUpdateUnit = usePermission("units.update"),
    canDeleteUnit = usePermission("units.delete");
  const canReadUnits = !isSeller && hasUnitsRead;
  const requestedTab = searchParams.get("section");
  const [tab, setTab] = useState<"products" | "units">(requestedTab === "units" ? "units" : "products"),
    [edit, setEdit] = useState<Product | Unit | null>(null),
    [showForm, setShowForm] = useState(false),
    [deleteTarget, setDeleteTarget] = useState<Product | Unit | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct),
    [unitForm, setUnitForm] = useState(emptyUnit);
  useEffect(() => {
    const nextTab = searchParams.get("section") === "units" ? "units" : "products";
    setTab(nextTab);
    setEdit(null);
    setShowForm(false);
  }, [searchParams]);
  const units = useQuery({
    queryKey: ["units"],
    queryFn: () => unitsApi.list(),
    enabled:
      canReadUnits || (!isSeller && (canCreateProduct || canUpdateProduct)),
  });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });
  const canCreate = tab === "products" ? canCreateProduct : canCreateUnit,
    canUpdate = tab === "products" ? canUpdateProduct : canUpdateUnit,
    canDelete = tab === "products" ? canDeleteProduct : canDeleteUnit;
  const save = useMutation({
    mutationFn: async () => {
      if (tab === "products") {
        if (
          !productForm.name.trim() ||
          !productForm.externalUnitId ||
          productForm.price < 0
        )
          throw Error("Completa nombre, unidad y un precio válido.");
        if (edit) await productsApi.update(edit.externalId, productForm);
        else await productsApi.create(productForm);
      } else {
        if (!unitForm.name.trim() || !unitForm.symbol.trim())
          throw Error("Nombre y símbolo son requeridos.");
        if (edit) await unitsApi.update(edit.externalId, unitForm);
        else await unitsApi.create(unitForm);
      }
    },
    onSuccess: async () => {
      setEdit(null);
      setShowForm(false);
      await cache.invalidateQueries({ queryKey: [tab] });
    },
  });
  const remove = async () => {
    if (!deleteTarget) return;
    await (tab === "products"
      ? productsApi.remove(deleteTarget.externalId)
      : unitsApi.remove(deleteTarget.externalId));
    setDeleteTarget(null);
    await cache.invalidateQueries({ queryKey: [tab] });
  };
  const rows = tab === "products" ? products.data?.items : units.data?.items;
  const openCreate = () => {
    setEdit(null);
    setShowForm(true);
    if (tab === "products") setProductForm(emptyProduct);
    else setUnitForm(emptyUnit);
  };
  const openEdit = (item: Product | Unit) => {
    setEdit(item);
    setShowForm(true);
    if ("code" in item)
      setProductForm({
        name: item.name,
        description: item.description,
        externalUnitId: item.externalUnitId,
        price: item.price,
        isActive: item.isActive,
      });
    else setUnitForm({ ...item });
  };
  return (
    <main className="customers-content">
      <PageHeader
        eyebrow="Catálogo"
        title={isSeller ? "Productos" : "Productos y unidades"}
        description={
          isSeller
            ? "Consulta los productos disponibles."
            : "Administra el catálogo comercial y sus unidades de medida."
        }
        action={
          canCreate &&
          !isSeller && (
            <button className="action-primary" onClick={openCreate}>
              <Plus />
              Nuevo {tab === "products" ? "producto" : "unidad"}
            </button>
          )
        }
      />
      {canReadUnits && (
        <nav className="activity-tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => {
              setTab("products");
              setSearchParams({ section: "products" });
              setShowForm(false);
            }}
          >
            Productos
          </button>
          <button
            className={tab === "units" ? "active" : ""}
            onClick={() => {
              setTab("units");
              setSearchParams({ section: "units" });
              setShowForm(false);
            }}
          >
            Unidades
          </button>
        </nav>
      )}
      {isSeller && (
        <p className="assignment-note">
          Vista de consulta. Tu rol no permite crear ni modificar productos o
          unidades.
        </p>
      )}
      <div className={showForm ? "catalog-grid" : ""}>
        <section className="customer-table-card">
          <DataState
            loading={tab === "products" ? products.isLoading : units.isLoading}
            error={tab === "products" ? products.error : units.error}
            isEmpty={!rows?.length}
            empty="No hay registros disponibles."
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>
                      {tab === "products" ? "Código / Precio" : "Símbolo"}
                    </th>
                    <th>Estado</th>
                    {(canUpdate || canDelete) && !isSeller && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows?.map((item) => (
                    <tr key={item.externalId}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        {"code" in item
                          ? `${item.code} · ${item.price}`
                          : item.symbol}
                      </td>
                      <td>{item.isActive ? "Activo" : "Inactivo"}</td>
                      {(canUpdate || canDelete) && !isSeller && (
                        <td>
                          {canUpdate && (
                            <button
                              className="row-action"
                              onClick={() => openEdit(item)}
                            >
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="row-action danger-text"
                      onClick={() => setDeleteTarget(item)}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </section>
        {showForm && !isSeller && (
          <CatalogForm
            tab={tab}
            product={productForm}
            unit={unitForm}
            setProduct={setProductForm}
            setUnit={setUnitForm}
            units={units.data?.items || []}
            submit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            error={save.error}
          />
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar registro"
        description={`¿Eliminar ${deleteTarget?.name ?? "este registro"}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </main>
  );
}

function CatalogForm({
  tab,
  product,
  unit,
  setProduct,
  setUnit,
  units,
  submit,
  error,
}: {
  tab: "products" | "units";
  product: ProductInput;
  unit: UnitInput;
  setProduct: (value: ProductInput) => void;
  setUnit: (value: UnitInput) => void;
  units: Unit[];
  submit: (event: FormEvent) => void;
  error: Error | null;
}) {
  return (
    <form className="customer-form catalog-form" onSubmit={submit}>
      <h2>{tab === "products" ? "Producto" : "Unidad"}</h2>
      {tab === "products" ? (
        <>
          <label>
            Nombre *
            <input
              required
              value={product.name}
              onChange={(event) =>
                setProduct({ ...product, name: event.target.value })
              }
            />
          </label>
          <label>
            Unidad *
            <select
              required
              value={product.externalUnitId}
              onChange={(event) =>
                setProduct({ ...product, externalUnitId: event.target.value })
              }
            >
              <option value="">Seleccionar</option>
              {units.map((item) => (
                <option key={item.externalId} value={item.externalId}>
                  {item.name} ({item.symbol})
                </option>
              ))}
            </select>
          </label>
          <label>
            Precio *
            <input
              required
              min="0"
              type="number"
              step="0.01"
              value={product.price}
              onChange={(event) =>
                setProduct({ ...product, price: Number(event.target.value) })
              }
            />
          </label>
        </>
      ) : (
        <>
          <label>
            Nombre *
            <input
              required
              value={unit.name}
              onChange={(event) =>
                setUnit({ ...unit, name: event.target.value })
              }
            />
          </label>
          <label>
            Símbolo *
            <input
              required
              value={unit.symbol}
              onChange={(event) =>
                setUnit({ ...unit, symbol: event.target.value })
              }
            />
          </label>
          <label className="catalog-option">
            <input
              type="checkbox"
              checked={unit.allowsDecimals}
              onChange={(event) =>
                setUnit({ ...unit, allowsDecimals: event.target.checked })
              }
            />
            <span>
              <strong>Permitir cantidades decimales</strong>
              <small>
                Habilita valores como 1,5 o 2,75 para esta unidad.
              </small>
            </span>
          </label>
        </>
      )}
      <label className="catalog-option">
        <input
          type="checkbox"
          checked={tab === "products" ? product.isActive : unit.isActive}
          onChange={(event) =>
            tab === "products"
              ? setProduct({ ...product, isActive: event.target.checked })
              : setUnit({ ...unit, isActive: event.target.checked })
          }
        />
        <span>
          <strong>
            {tab === "products" ? "Producto activo" : "Unidad activa"}
          </strong>
          <small>
            Estará disponible para utilizarse en nuevos registros.
          </small>
        </span>
      </label>
      {error && <p className="form-error">{error.message}</p>}
      <button className="action-primary">Guardar</button>
    </form>
  );
}
