"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProductAction } from "@/modules/products/server-actions/product.actions";
import { createProductSchema, CreateProductInput } from "@/modules/products/schemas/product.schema";

type ProductFormProps = {
  suppliers: Array<{ id: string; name: string }>;
};

type ProductFormValues = Omit<CreateProductInput, "variants">;

const AVAILABLE_SIZES = ["O/S", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => AVAILABLE_SIZES.indexOf(a) - AVAILABLE_SIZES.indexOf(b));
}

export function ProductForm({ suppliers }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const form = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      description: "",
      barcode: "",
      costPrice: 0,
      price: 0,
      currentStock: 0,
      lowStockAlert: 5,
      supplierId: suppliers[0]?.id ?? ""
    }
  });

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        const next = prev.filter((item) => item !== size);
        return sortSizes(next);
      }

      return sortSizes([...prev, size]);
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        let variants: CreateProductInput["variants"] = [];

        if (selectedSizes.length > 0) {
          variants = selectedSizes.map((size) => {
            return {
              name: "Talle",
              value: size,
              stock: 0,
              extraPrice: 0
            };
          });
        }

        const payload = createProductSchema.parse({
          name: values.name,
          description: values.description,
          barcode: values.barcode,
          costPrice: values.costPrice,
          price: values.price,
          currentStock: 0,
          lowStockAlert: values.lowStockAlert,
          supplierId: values.supplierId,
          variants
        });

        await createProductAction(payload);
        form.reset({
          name: "",
          description: "",
          barcode: "",
          costPrice: 0,
          price: 0,
          currentStock: 0,
          lowStockAlert: 5,
          supplierId: suppliers[0]?.id ?? ""
        });
        setSelectedSizes([]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el producto");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del producto</label>
        <Input placeholder="" {...form.register("name")} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Costo del producto</label>
        <Input
          type="number"
          step="0.01"
          placeholder=""
          {...form.register("costPrice", { valueAsNumber: true })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Precio de venta</label>
        <Input
          type="number"
          step="0.01"
          placeholder=""
          {...form.register("price", { valueAsNumber: true })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Codigo de barras (opcional)</label>
        <Input placeholder="" {...form.register("barcode")} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Alerta de stock bajo</label>
        <Input
          type="number"
          placeholder=""
          {...form.register("lowStockAlert", { valueAsNumber: true })}
        />
      </div>

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

      <div className="md:col-span-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Seleccion de talles
        </label>
        <div className="flex flex-wrap gap-2 rounded-lg border p-3">
          {AVAILABLE_SIZES.map((size) => {
            const active = selectedSizes.includes(size);

            return (
              <button
                type="button"
                key={size}
                onClick={() => toggleSize(size)}
                className={`rounded-md border px-3 py-1 text-sm font-medium ${
                  active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Marca los talles disponibles. El stock se carga despues desde Inventario al ingresar mercaderia.
        </p>
      </div>

      <div className="md:col-span-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">Color (opcional)</label>
        <Input placeholder="Ej: Negro, Beige, Blanco" {...form.register("description")} />
      </div>
      {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
      <div className="md:col-span-3">
        <Button disabled={isPending}>Crear producto</Button>
      </div>
    </form>
  );
}
