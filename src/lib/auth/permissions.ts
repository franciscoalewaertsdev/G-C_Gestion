import { AppRole } from "@/types/auth";

const PERMISSIONS: Record<AppRole, string[]> = {
  admin: ["all", "reports", "users", "inventory", "sales", "payments", "products", "suppliers", "invoices"],
  empleado: ["inventory", "sales", "payments", "products"]
};

export function hasPermission(role: AppRole, permission: string) {
  return PERMISSIONS[role].includes("all") || PERMISSIONS[role].includes(permission as never);
}
