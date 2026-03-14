"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { sendInvoiceEmailAction } from "@/modules/invoices/server-actions/invoice.actions";
import { createSaleSchema } from "@/modules/sales/schemas/sale.schema";
import { registerSaleAction } from "@/modules/sales/server-actions/sale.actions";

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20] as const;
const SIZE_ORDER = ["O/S", "XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function getSizeRank(value: string) {
  const normalized = value.trim().toUpperCase();
  const index = SIZE_ORDER.indexOf(normalized as (typeof SIZE_ORDER)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

type SaleFormProduct = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  supplierId: string;
  supplierName: string;
  variants: Array<{
    id: string;
    name: string;
    value: string;
    stock: number;
  }>;
};

type SaleFormSupplier = {
  id: string;
  name: string;
};

type CartItem = {
  key: string;
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  barcode: string | null;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  stock: number;
};

type FormValues = {
  generateInvoice: boolean;
  paymentMethod: "EFECTIVO" | "TARJETA";
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
  customerName: string;
  customerDocument: string;
  customerEmail: string;
  sendInvoiceEmail: boolean;
  search: string;
  supplierId: string;
};

export function SaleForm({ products, suppliers }: { products: SaleFormProduct[]; suppliers: SaleFormSupplier[] }) {
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [latestInvoice, setLatestInvoice] = useState<{ id: string; number: string; email?: string } | null>(null);
  const [isSendingInvoiceEmail, setIsSendingInvoiceEmail] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      generateInvoice: false,
      paymentMethod: "EFECTIVO",
      discountType: "NONE",
      discountValue: 0,
      customerName: "",
      customerDocument: "",
      customerEmail: "",
      sendInvoiceEmail: true,
      search: "",
      supplierId: "ALL"
    }
  });

  const search = form.watch("search");
  const selectedSupplierId = form.watch("supplierId");
  const selectedDiscountType = form.watch("discountType");
  const selectedDiscountValue = Number(form.watch("discountValue") || 0);
  const generateInvoice = form.watch("generateInvoice");
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch.length < 2) {
      return [];
    }

    return products
      .filter((product) => {
        const bySupplier = selectedSupplierId === "ALL" || product.supplierId === selectedSupplierId;
        if (!bySupplier) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.id.toLowerCase().includes(normalizedSearch) ||
          (product.barcode ?? "").toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 12);
  }, [products, search, selectedSupplierId]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (selectedDiscountType === "NONE") {
      return 0;
    }

    const raw = selectedDiscountType === "PERCENTAGE" ? subtotal * (selectedDiscountValue / 100) : selectedDiscountValue;
    return Math.min(Number(raw.toFixed(2)), subtotal);
  }, [selectedDiscountType, selectedDiscountValue, subtotal]);

  const totalFinal = useMemo(() => Number((subtotal - discountAmount).toFixed(2)), [subtotal, discountAmount]);

  const handleDiscountClick = (value: number) => {
    form.setValue("discountType", value === 0 ? "NONE" : "PERCENTAGE", { shouldDirty: true });
    form.setValue("discountValue", value, { shouldDirty: true });
  };

  const getVariantLabel = (product: SaleFormProduct, variantId?: string) => {
    if (!variantId) {
      return undefined;
    }

    const variant = product.variants.find((row) => row.id === variantId);
    return variant ? `${variant.name} ${variant.value}` : undefined;
  };

  const addToCart = (product: SaleFormProduct) => {
    const variantId = selectedVariantByProduct[product.id];
    const selectedVariant = product.variants.find((variant) => variant.id === variantId);
    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

    if (product.variants.length > 0 && !selectedVariant) {
      setError(`Debes elegir un talle para ${product.name}.`);
      return;
    }

    if (availableStock <= 0) {
      return;
    }

    setCart((current) => {
      const key = `${product.id}:${selectedVariant?.id ?? "none"}`;
      const existing = current.find((item) => item.key === key);
      if (!existing) {
        return [
          ...current,
          {
            key,
            productId: product.id,
            variantId: selectedVariant?.id,
            variantLabel: getVariantLabel(product, selectedVariant?.id),
            name: product.name,
            barcode: product.barcode,
            supplierName: product.supplierName,
            quantity: 1,
            unitPrice: product.price,
            stock: availableStock
          }
        ];
      }

      return current.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, item.stock)
            }
          : item
      );
    });
    setError(null);
  };

  const setItemQuantity = (key: string, quantity: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.key !== key) {
            return item;
          }

          const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.min(quantity, item.stock)) : 1;
          return { ...item, quantity: safeQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setCart((current) => current.filter((item) => item.key !== key));
  };

  const triggerInvoiceEmail = async (invoiceId: string, email?: string) => {
    if (!email) {
      setError("Debes ingresar un email para enviar la factura.");
      return;
    }

    try {
      setIsSendingInvoiceEmail(true);
      await sendInvoiceEmailAction({ invoiceId, customerEmail: email });
      setError(null);
    } catch (emailError) {
      setError(emailError instanceof Error ? emailError.message : "No se pudo enviar la factura por email.");
    } finally {
      setIsSendingInvoiceEmail(false);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setLatestInvoice(null);

    if (cart.length === 0) {
      setError("Agrega al menos un producto a la venta.");
      return;
    }

    if (values.generateInvoice && (!values.customerName || !values.customerDocument)) {
      setError("Para facturar debes completar nombre y documento del cliente.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = createSaleSchema.parse({
          generateInvoice: values.generateInvoice,
          paymentMethod: values.paymentMethod,
          discountType: values.discountType,
          discountValue: Number(values.discountValue),
          customer: values.generateInvoice
            ? {
                name: values.customerName,
                documentId: values.customerDocument,
                email: values.customerEmail || undefined
              }
            : undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        });

        const sale = await registerSaleAction(payload);

        if (values.generateInvoice && sale?.invoice?.id) {
          const invoiceInfo = {
            id: String(sale.invoice.id),
            number: String(sale.invoice.invoiceNumber),
            email: values.customerEmail || undefined
          };
          setLatestInvoice(invoiceInfo);

          if (values.sendInvoiceEmail && values.customerEmail) {
            await triggerInvoiceEmail(invoiceInfo.id, values.customerEmail);
          }
        }

        form.reset({
          generateInvoice: false,
          paymentMethod: "EFECTIVO",
          discountType: "NONE",
          discountValue: 0,
          customerName: "",
          customerDocument: "",
          customerEmail: "",
          sendInvoiceEmail: true,
          search: "",
          supplierId: "ALL"
        });
        setCart([]);
        setSelectedVariantByProduct({});
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar la venta");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold">Registrar venta</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Buscar por nombre, codigo o SKU"
          autoComplete="off"
          {...form.register("search")}
        />
        <select className="h-10 rounded-md border px-3" {...form.register("supplierId")}>
          <option value="ALL">Todos los proveedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      {search.trim().length < 2 && (
        <p className="text-sm text-slate-500">Escribe al menos 2 caracteres para buscar productos.</p>
      )}

      {search.trim().length >= 2 && (
        <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Talle</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No hay productos para ese filtro.
                </TableCell>
              </TableRow>
            )}
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-slate-500">{product.barcode || "Sin codigo"}</span>
                  </div>
                </TableCell>
                <TableCell>{product.supplierName}</TableCell>
                <TableCell>
                  {product.variants.length === 0 ? (
                    <span className="text-xs text-slate-500">Sin talles</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {[...product.variants]
                        .sort((a, b) => {
                          const rankDiff = getSizeRank(a.value) - getSizeRank(b.value);
                          if (rankDiff !== 0) {
                            return rankDiff;
                          }

                          return a.value.localeCompare(b.value, "es", { sensitivity: "base" });
                        })
                        .map((variant) => {
                        const active = selectedVariantByProduct[product.id] === variant.id;
                        return (
                          <button
                            type="button"
                            key={variant.id}
                            onClick={() =>
                              setSelectedVariantByProduct((prev) => ({
                                ...prev,
                                [product.id]: variant.id
                              }))
                            }
                            className={cn(
                              "rounded border px-2 py-1 text-xs",
                              active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"
                            )}
                          >
                            {variant.value} ({variant.stock})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>
                  {product.variants.length > 0
                    ? (product.variants.find((row) => row.id === selectedVariantByProduct[product.id])?.stock ?? "-")
                    : product.stock}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      product.variants.length > 0
                        ? !selectedVariantByProduct[product.id] ||
                          (product.variants.find((row) => row.id === selectedVariantByProduct[product.id])?.stock ?? 0) <= 0
                        : product.stock <= 0
                    }
                    onClick={() => addToCart(product)}
                  >
                    Agregar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Productos seleccionados</p>
        {cart.length === 0 && <p className="text-sm text-slate-500">Todavia no agregaste productos.</p>}
        {cart.map((item) => (
          <div key={item.key} className="grid gap-2 rounded-md border p-2 md:grid-cols-[1fr_120px_120px_auto]">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-slate-500">
                {item.barcode || "Sin codigo"} | {item.supplierName}
                {item.variantLabel ? ` | ${item.variantLabel}` : ""}
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={item.stock}
              value={item.quantity}
              onChange={(event) => setItemQuantity(item.key, Number(event.target.value))}
            />
            <Input
              type="number"
              step="0.01"
              min={0}
              value={item.unitPrice}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setCart((current) =>
                  current.map((entry) =>
                    entry.key === item.key ? { ...entry, unitPrice: Number.isFinite(nextValue) ? nextValue : 0 } : entry
                  )
                );
              }}
            />
            <Button type="button" variant="ghost" onClick={() => removeItem(item.key)}>
              Quitar
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Metodo de pago</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "rounded-md border border-primary px-3 py-1 text-sm text-white",
              form.watch("paymentMethod") === "EFECTIVO"
                ? "bg-primary shadow-sm"
                : "bg-white text-primary hover:bg-slate-50"
            )}
            onClick={() => form.setValue("paymentMethod", "EFECTIVO", { shouldDirty: true })}
          >
            Efectivo
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md border border-primary px-3 py-1 text-sm text-white",
              form.watch("paymentMethod") === "TARJETA"
                ? "bg-primary shadow-sm"
                : "bg-white text-primary hover:bg-slate-50"
            )}
            onClick={() => form.setValue("paymentMethod", "TARJETA", { shouldDirty: true })}
          >
            Tarjeta
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Descuento</p>
        <div className="flex flex-wrap gap-2">
          {DISCOUNT_OPTIONS.map((value) => {
            const isActive =
              (value === 0 && selectedDiscountType === "NONE") ||
              (selectedDiscountType === "PERCENTAGE" && selectedDiscountValue === value);

            return (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => handleDiscountClick(value)}
              >
                {value}%
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            {...form.register("generateInvoice")}
          />
          Emitir factura para esta venta
        </label>
        {!generateInvoice && <Badge variant="secondary">Venta ordinaria</Badge>}
      </div>

      {generateInvoice && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Cliente" {...form.register("customerName")} />
          <Input placeholder="Documento" {...form.register("customerDocument")} />
          <Input placeholder="Email (opcional)" {...form.register("customerEmail")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              {...form.register("sendInvoiceEmail")}
            />
            Envio de factura por email automaticamente
          </label>
        </div>
      )}

      <div className="rounded-lg border p-3 text-sm text-slate-700">
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        <p>Descuento: ${discountAmount.toFixed(2)}</p>
        <p className="font-semibold">Total: ${totalFinal.toFixed(2)}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button disabled={isPending}>Confirmar venta</Button>

      {latestInvoice && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <span className="font-medium text-green-800">Factura {latestInvoice.number} generada.</span>
          <a
            href={`/api/invoices/${latestInvoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Descargar factura
          </a>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void triggerInvoiceEmail(latestInvoice.id, latestInvoice.email)}
            disabled={!latestInvoice.email || isSendingInvoiceEmail}
          >
            {isSendingInvoiceEmail ? "Enviando..." : "Enviar por email"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setLatestInvoice(null)}
            aria-label="Cerrar aviso"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </form>
  );
}
