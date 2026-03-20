"use client";

import { useTransition } from "react";
import { getStockEntryForEditAction } from "@/modules/inventory/server-actions/stock-entry.actions";

type InventoryEditFullButtonProps = {
  id: string;
};

export function InventoryEditFullButton({ id }: InventoryEditFullButtonProps) {
  const [isPending, startTransition] = useTransition();

  const startFullEdit = () => {
    startTransition(async () => {
      const entry = await getStockEntryForEditAction(id);
      window.dispatchEvent(new CustomEvent("inventory:start-edit", { detail: entry }));
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
