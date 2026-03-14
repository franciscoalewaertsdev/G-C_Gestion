"use client";

import { Fragment, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { deleteProductAction, updateProductBasicAction } from "@/modules/products/server-actions/product.actions";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  costPrice: number;
  price: number;
  currentStock: number;
  lowStockAlert: number;
  supplier: string;
  variants: Array<{
    id: string;
    name: string;
    value: string;
    stock: number;
  }>;
};

export function ProductsTable({ data }: { data: ProductRow[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    costPrice: string;
    price: string;
    currentStock: string;
    lowStockAlert: string;
  } | null>(null);
  const [editVariantStock, setEditVariantStock] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return data;
    }

    return data.filter((item) => {
      const byName = item.name.toLowerCase().includes(query);
      const bySupplier = item.supplier.toLowerCase().includes(query);
      return byName || bySupplier;
    });
  }, [data, search]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProductAction(id);
      setPendingDeleteId(null);
      setFeedback({ type: "success", message: "Producto eliminado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el producto."
      });
    }
  };

  const startEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setPendingDeleteId(null);
    setEditVariantStock(
      Object.fromEntries(product.variants.map((variant) => [variant.id, String(variant.stock)]))
    );
    setEditForm({
      name: product.name,
      description: product.description ?? "",
      costPrice: String(product.costPrice),
      price: String(product.price),
      currentStock: String(product.currentStock),
      lowStockAlert: String(product.lowStockAlert)
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditVariantStock({});
  };

  const handleEdit = async (product: ProductRow) => {
    if (!editForm) {
      return;
    }

    const price = Number(editForm.price);
    const costPrice = Number(editForm.costPrice);
    const lowStockAlert = Number(editForm.lowStockAlert);
    const hasVariants = product.variants.length > 0;
    const manualCurrentStock = Number(editForm.currentStock);

    if (
      !editForm.name.trim() ||
      Number.isNaN(costPrice) ||
      Number.isNaN(price) ||
      (!hasVariants && Number.isNaN(manualCurrentStock)) ||
      Number.isNaN(lowStockAlert)
    ) {
      setFeedback({ type: "error", message: "Completa los campos requeridos con valores validos." });
      return;
    }

    try {
      const parsedVariantStocks = hasVariants
        ? product.variants.map((variant) => {
            const rawValue = editVariantStock[variant.id] ?? "0";
            const stock = Number(rawValue);

            if (!Number.isInteger(stock) || stock < 0) {
              throw new Error(`Stock invalido para talle ${variant.value}.`);
            }

            return { id: variant.id, stock };
          })
        : [];

      const currentStock = hasVariants
        ? parsedVariantStocks.reduce((sum, variant) => sum + variant.stock, 0)
        : manualCurrentStock;

      await updateProductBasicAction({
        id: product.id,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        costPrice,
        price,
        currentStock,
        lowStockAlert,
        variantStocks: parsedVariantStocks
      });
      cancelEdit();
      setFeedback({ type: "success", message: "Producto actualizado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar el producto."
      });
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar producto o proveedor..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {feedback && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((product) => (
              <Fragment key={product.id}>
                <TableRow key={product.id}>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        value={editForm?.name ?? ""}
                        onChange={(event) =>
                          setEditForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                        }
                      />
                    ) : (
                      product.name
                    )}
                  </TableCell>
                  <TableCell>{product.supplier}</TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm?.costPrice ?? ""}
                        onChange={(event) =>
                          setEditForm((prev) => (prev ? { ...prev, costPrice: event.target.value } : prev))
                        }
                      />
                    ) : (
                      formatCurrency(product.costPrice)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm?.price ?? ""}
                        onChange={(event) =>
                          setEditForm((prev) => (prev ? { ...prev, price: event.target.value } : prev))
                        }
                      />
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <div className="space-y-2">
                        {product.variants.length > 0 ? (
                          <div className="space-y-2 rounded-md border bg-slate-50 p-2">
                            <p className="text-xs font-semibold text-slate-600">Stock por talle</p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {product.variants.map((variant) => (
                                <div key={variant.id} className="space-y-1">
                                  <label className="text-xs text-slate-600">{variant.value}</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={editVariantStock[variant.id] ?? "0"}
                                    onChange={(event) =>
                                      setEditVariantStock((prev) => ({
                                        ...prev,
                                        [variant.id]: event.target.value
                                      }))
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-xs font-medium text-slate-700">
                              Stock total: {product.variants.reduce((sum, variant) => {
                                const parsed = Number(editVariantStock[variant.id] ?? "0");
                                return sum + (Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                              }, 0)}
                            </p>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={editForm?.currentStock ?? ""}
                            onChange={(event) =>
                              setEditForm((prev) => (prev ? { ...prev, currentStock: event.target.value } : prev))
                            }
                          />
                        )}
                        <Input
                          type="number"
                          value={editForm?.lowStockAlert ?? ""}
                          onChange={(event) =>
                            setEditForm((prev) => (prev ? { ...prev, lowStockAlert: event.target.value } : prev))
                          }
                        />
                        <Input
                          placeholder="Descripcion"
                          value={editForm?.description ?? ""}
                          onChange={(event) =>
                            setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                          }
                        />
                      </div>
                    ) : (
                      product.currentStock
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                        onClick={() => setExpandedId((prev) => (prev === product.id ? null : product.id))}
                      >
                        {expandedId === product.id ? "Ocultar" : "Ver talles"}
                      </button>
                      {editingId === product.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            onClick={() => void handleEdit(product)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                            onClick={() => startEdit(product)}
                          >
                            Editar
                          </button>
                          {pendingDeleteId === product.id ? (
                            <>
                              <button
                                type="button"
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                onClick={() => void handleDelete(product.id)}
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                                onClick={() => setPendingDeleteId(null)}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm(null);
                                setPendingDeleteId(product.id);
                              }}
                            >
                              Eliminar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {expandedId === product.id && (
                  <TableRow key={`${product.id}-expanded`}>
                    <TableCell colSpan={6}>
                      <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Descripcion</p>
                          <p className="text-sm text-slate-700">{product.description || "Sin descripcion"}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500">Stock por talle</p>
                          {product.variants.length === 0 ? (
                            <p className="text-sm text-slate-700">Este producto no tiene talles cargados.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {product.variants.map((variant) => (
                                <span
                                  key={variant.id}
                                  className="rounded-full border bg-white px-3 py-1 text-xs font-medium"
                                >
                                  {variant.value}: {variant.stock}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
