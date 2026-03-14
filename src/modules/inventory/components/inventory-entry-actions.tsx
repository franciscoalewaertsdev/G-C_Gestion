"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { deleteStockEntryAction, updateStockEntryNotesAction } from "@/modules/inventory/server-actions/stock-entry.actions";

type InventoryEntryActionsProps = {
  id: string;
  notes: string | null;
};

export function InventoryEntryActions({ id, notes }: InventoryEntryActionsProps) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notesValue, setNotesValue] = useState(notes ?? "");

  const saveNotes = async () => {
    try {
      await updateStockEntryNotesAction({ id, notes: notesValue });
      setIsEditing(false);
      setFeedback({ type: "success", message: "Ingreso actualizado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo editar el ingreso."
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStockEntryAction(id);
      setPendingDelete(false);
      setFeedback({ type: "success", message: "Ingreso eliminado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el ingreso."
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <Input value={notesValue} onChange={(event) => setNotesValue(event.target.value)} />
            <button
              type="button"
              className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              onClick={() => void saveNotes()}
            >
              Guardar
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
              onClick={() => {
                setIsEditing(false);
                setNotesValue(notes ?? "");
              }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
              onClick={() => {
                setPendingDelete(false);
                setIsEditing(true);
              }}
            >
              Editar
            </button>
            {pendingDelete ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  onClick={() => void handleDelete()}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                  onClick={() => setPendingDelete(false)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                onClick={() => {
                  setIsEditing(false);
                  setPendingDelete(true);
                }}
              >
                Eliminar
              </button>
            )}
          </>
        )}
      </div>
      {feedback && (
        <div
          className={`rounded-md border px-2 py-1 text-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
