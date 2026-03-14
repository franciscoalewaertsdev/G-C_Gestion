import { SupplierForm } from "@/modules/suppliers/components/supplier-form";
import { SuppliersTable } from "@/modules/suppliers/components/suppliers-table";
import { listSuppliers } from "@/modules/suppliers/services/supplier.service";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Proveedores</h2>
      <SupplierForm />
      <SuppliersTable
        data={suppliers.map((item) => ({
          id: item.id,
          name: item.name,
          contactName: item.contactName,
          email: item.email,
          phone: item.phone,
          productsCount: item.products.length
        }))}
      />
    </div>
  );
}
