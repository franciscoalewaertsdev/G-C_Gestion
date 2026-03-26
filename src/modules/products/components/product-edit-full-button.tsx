"use client";

import { useTransition } from "react";
import { getProductForEditAction } from "@/modules/products/server-actions/product.actions";

type ProductEditFullButtonProps = {
  id: string;
};

export function ProductEditFullButton({ id }: ProductEditFullButtonProps) {
  const [isPending, startTransition] = useTransition();

  const startFullEdit = () => {
    startTransition(async () => {
      const product = await getProductForEditAction(id);
      window.dispatchEvent(new CustomEvent("products:start-edit", { detail: product }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
      onClick={startFullEdit}
      disabled={isPending}
    >
      {isPending ? "Cargando..." : "Editar completo"}
    </button>
  );
}
