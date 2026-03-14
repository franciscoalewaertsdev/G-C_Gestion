"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupplierAction } from "@/modules/suppliers/server-actions/supplier.actions";
import { createSupplierSchema, CreateSupplierInput } from "@/modules/suppliers/schemas/supplier.schema";

export function SupplierForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      await createSupplierAction(values);
      form.reset();
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <Input placeholder="Nombre" {...form.register("name")} />
      <Input placeholder="Contacto" {...form.register("contactName")} />
      <Input placeholder="Email" {...form.register("email")} />
      <Input placeholder="Telefono" {...form.register("phone")} />
      <Input className="md:col-span-2" placeholder="Direccion" {...form.register("address")} />
      <Button disabled={isPending}>Crear proveedor</Button>
    </form>
  );
}
