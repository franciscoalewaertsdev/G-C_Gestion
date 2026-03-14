"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/lib/table/data-table";
import { deleteSupplierAction, updateSupplierAction } from "@/modules/suppliers/server-actions/supplier.actions";

type SupplierRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  productsCount: number;
};

export function SuppliersTable({ data }: { data: SupplierRow[] }) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", contactName: "", email: "", phone: "" });

  const startEdit = (row: SupplierRow) => {
    setEditingId(row.id);
    setPendingDeleteId(null);
    setEditForm({
      name: row.name,
      contactName: row.contactName ?? "",
      email: row.email ?? "",
      phone: row.phone ?? ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", contactName: "", email: "", phone: "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) {
      setFeedback({ type: "error", message: "El nombre del proveedor es obligatorio." });
      return;
    }

    try {
      await updateSupplierAction({
        id,
        name: editForm.name.trim(),
        contactName: editForm.contactName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim()
      });
      cancelEdit();
      setFeedback({ type: "success", message: "Proveedor actualizado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo editar el proveedor."
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplierAction(id);
      setPendingDeleteId(null);
      setFeedback({ type: "success", message: "Proveedor eliminado correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el proveedor."
      });
    }
  };

  const columns = useMemo<ColumnDef<SupplierRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Proveedor",
        cell: ({ row }) =>
          editingId === row.original.id ? (
            <Input
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          ) : (
            row.original.name
          )
      },
      {
        accessorKey: "contactName",
        header: "Contacto",
        cell: ({ row }) =>
          editingId === row.original.id ? (
            <Input
              value={editForm.contactName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, contactName: event.target.value }))}
            />
          ) : (
            row.original.contactName ?? "-"
          )
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) =>
          editingId === row.original.id ? (
            <Input
              value={editForm.email}
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          ) : (
            row.original.email ?? "-"
          )
      },
      {
        accessorKey: "phone",
        header: "Telefono",
        cell: ({ row }) =>
          editingId === row.original.id ? (
            <Input
              value={editForm.phone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          ) : (
            row.original.phone ?? "-"
          )
      },
      { accessorKey: "productsCount", header: "Productos" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-1">
            {editingId === row.original.id ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700"
                  onClick={() => void saveEdit(row.original.id)}
                >
                  Guardar
                </button>
                <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={cancelEdit}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs"
                  onClick={() => startEdit(row.original)}
                >
                  Editar
                </button>
                {pendingDeleteId === row.original.id ? (
                  <>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                      onClick={() => void handleDelete(row.original.id)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                    onClick={() => {
                      cancelEdit();
                      setPendingDeleteId(row.original.id);
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </>
            )}
          </div>
        )
      }
    ],
    [editForm, editingId, pendingDeleteId]
  );

  return (
    <div className="space-y-3">
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
      <DataTable columns={columns} data={data} searchColumn="name" searchPlaceholder="Buscar proveedor..." />
    </div>
  );
}
