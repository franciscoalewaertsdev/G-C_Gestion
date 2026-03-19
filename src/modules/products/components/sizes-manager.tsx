"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGlobalSizeAction, deleteGlobalSizeAction } from "@/modules/products/server-actions/size.actions";

type GlobalSize = {
  id: string;
  name: string;
};

type SizesManagerProps = {
  initialSizes: GlobalSize[];
};

export function SizesManager({ initialSizes }: SizesManagerProps) {
  const [sizes, setSizes] = useState<GlobalSize[]>(initialSizes);
  const [newSizeName, setNewSizeName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddSize = () => {
    if (!newSizeName.trim()) {
      setError("Ingresa un nombre para el talle");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const size = await createGlobalSizeAction(newSizeName);
        setSizes([...sizes, size]);
        setNewSizeName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo agregar el talle");
      }
    });
  };

  const handleDeleteSize = (id: string) => {
    startTransition(async () => {
      try {
        await deleteGlobalSizeAction(id);
        setSizes(sizes.filter((s) => s.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar el talle");
      }
    });
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-base font-semibold">Gestionar Talles Disponibles</h3>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Ej: S, M, L, XL, O/S..."
          value={newSizeName}
          onChange={(e) => setNewSizeName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddSize()}
          disabled={isPending}
          className="flex-1"
        />
        <Button
          onClick={handleAddSize}
          disabled={isPending || !newSizeName.trim()}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {sizes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay talles registrados. Crea el primero.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <div
              key={size.id}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm"
            >
              <span className="font-medium">{size.name}</span>
              <button
                onClick={() => handleDeleteSize(size.id)}
                disabled={isPending}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                title="Eliminar talle"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
