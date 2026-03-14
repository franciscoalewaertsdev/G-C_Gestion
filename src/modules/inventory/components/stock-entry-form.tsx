"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { registerStockEntryAction } from "@/modules/inventory/server-actions/stock-entry.actions";
import { createStockEntrySchema } from "@/modules/inventory/schemas/stock-entry.schema";

type Props = {
  suppliers: Array<{ id: string; name: string }>;
  products: Array<{
    id: string;
    name: string;
    costPrice: number;
    supplierId: string;
    variants: Array<{ id: string; name: string; value: string }>;
  }>;
};

type FormValues = {
  supplierId: string;
  entryDate: string;
  notes: string;
};

type StockItemRow = {
  productId: string;
  productQuery: string;
  variantId: string;
  quantity: number;
};

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${day}/${month}/${year}`;
}

function parseDayMonthYearDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    throw new Error("La fecha debe tener formato dia/mes/año (ej: 14/03/2026).");
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  const isValid =
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;

  if (!isValid) {
    throw new Error("La fecha ingresada no es valida.");
  }

  return parsed;
}

export function StockEntryForm({ suppliers, products }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [focusedProductRow, setFocusedProductRow] = useState<number | null>(null);
  const todayInputValue = getTodayInputValue();
  const defaultSupplierId = suppliers[0]?.id ?? "";
  const createEmptyRow = (): StockItemRow => ({
    productId: "",
    productQuery: "",
    variantId: "",
    quantity: 1
  });
  const [items, setItems] = useState<StockItemRow[]>([
    createEmptyRow()
  ]);
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      supplierId: defaultSupplierId,
      entryDate: todayInputValue,
      notes: ""
    }
  });

  const selectedSupplierId = form.watch("supplierId");

  const filteredProducts = useMemo(
    () => products.filter((product) => product.supplierId === selectedSupplierId),
    [products, selectedSupplierId]
  );

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const existsInSupplier = filteredProducts.some((product) => product.id === item.productId);

        if (existsInSupplier) {
          const product = filteredProducts.find((p) => p.id === item.productId);
          const variantExists = product?.variants.some((variant) => variant.id === item.variantId);
          return {
            ...item,
            productQuery: product?.name ?? item.productQuery,
            variantId: variantExists ? item.variantId : product?.variants[0]?.id ?? ""
          };
        }

        return {
          ...item,
          productId: "",
          productQuery: "",
          variantId: ""
        };
      })
    );
  }, [filteredProducts]);

  const addRowAfter = (index: number) => {
    setItems((prev) => [
      ...prev.slice(0, index + 1),
      createEmptyRow(),
      ...prev.slice(index + 1)
    ]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateRow = (index: number, key: "variantId" | "quantity", value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return { ...item, [key]: value } as StockItemRow;
      })
    );
  };

  const updateProductQuery = (index: number, query: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          productQuery: query,
          productId: "",
          variantId: ""
        };
      })
    );
  };

  const selectProduct = (index: number, productId: string) => {
    const product = filteredProducts.find((p) => p.id === productId);
    if (!product) {
      return;
    }

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          productId: product.id,
          productQuery: product.name,
          variantId: product.variants[0]?.id ?? ""
        };
      })
    );
    setFocusedProductRow(null);
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);

    startTransition(async () => {
      try {
        if (filteredProducts.length === 0) {
          throw new Error("El proveedor seleccionado no tiene productos cargados.");
        }

        if (items.some((item) => !item.productId)) {
          throw new Error("Selecciona un producto valido en todas las filas.");
        }

        const parsedItems = items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity)
        }));

        const variantSummary = items
          .map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const variant = product?.variants.find((v) => v.id === item.variantId);
            if (!variant) {
              return `${product?.name ?? "Producto"}: sin variante`;
            }
            return `${product?.name ?? "Producto"}: ${variant.name} ${variant.value}`;
          })
          .join(" | ");

        const payload = createStockEntrySchema.parse({
          supplierId: values.supplierId,
          entryDate: parseDayMonthYearDate(values.entryDate),
          notes: values.notes
            ? `${values.notes} | Variantes: ${variantSummary}`
            : `Variantes: ${variantSummary}`,
          items: parsedItems
        });

        await registerStockEntryAction(payload);
        form.reset({ supplierId: defaultSupplierId, entryDate: getTodayInputValue(), notes: "" });
        setItems([createEmptyRow()]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar el ingreso");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold">Nuevo ingreso de stock (albaran digital)</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Proveedor</label>
        <select className="h-10 w-full rounded-md border px-3" {...form.register("supplierId")}>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Fecha del albaran</label>
        <Input
          type="text"
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          {...form.register("entryDate")}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notas (opcional)</label>
        <Input placeholder="Referencia del albaran" {...form.register("notes")} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Productos a ingresar</p>

        {items.map((item, index) => {
          const selectedProduct = products.find((p) => p.id === item.productId);
          const variants = selectedProduct?.variants ?? [];
          const readOnlyUnitCost = selectedProduct ? formatCurrency(selectedProduct.costPrice) : "-";
          const canSuggestProducts = item.productQuery.trim().length >= 2;
          const matchingProducts = canSuggestProducts
            ? filteredProducts
                .filter((product) => product.name.toLowerCase().includes(item.productQuery.trim().toLowerCase()))
                .slice(0, 8)
            : [];
          const showSuggestions = focusedProductRow === index && matchingProducts.length > 0;

          return (
            <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Producto</label>
                <div className="relative">
                  <Input
                    placeholder={
                      filteredProducts.length === 0
                        ? "Sin productos para este proveedor"
                        : "Escribe al menos 2 caracteres"
                    }
                    value={item.productQuery}
                    onFocus={() => setFocusedProductRow(index)}
                    onBlur={() => {
                      setTimeout(() => {
                        setFocusedProductRow((current) => (current === index ? null : current));
                      }, 120);
                    }}
                    onChange={(event) => updateProductQuery(index, event.target.value)}
                    disabled={filteredProducts.length === 0}
                  />
                  {showSuggestions && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
                      {matchingProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectProduct(index, product.id);
                          }}
                        >
                          {product.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Variante / Talle</label>
                <select
                  className="h-10 w-full rounded-md border px-3"
                  value={item.variantId}
                  onChange={(event) => updateRow(index, "variantId", event.target.value)}
                  disabled={variants.length === 0}
                >
                  {variants.length === 0 && <option value="">Sin variantes</option>}
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}: {variant.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateRow(index, "quantity", Number(event.target.value))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Costo unitario</label>
                <Input value={readOnlyUnitCost} readOnly disabled />
              </div>

              <div className="md:col-span-1 flex items-end justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-0"
                  onClick={() => addRowAfter(index)}
                  aria-label="Agregar fila"
                  title="Agregar fila"
                >
                  <Plus size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 p-0"
                  onClick={() => removeRow(index)}
                  disabled={items.length === 1}
                  aria-label="Quitar fila"
                  title="Quitar fila"
                >
                  <Minus size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button disabled={isPending}>Registrar ingreso</Button>
    </form>
  );
}
