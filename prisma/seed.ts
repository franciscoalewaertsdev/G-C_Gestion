import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [adminRole, employeeRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: { name: "admin" }
    }),
    prisma.role.upsert({
      where: { name: "empleado" },
      update: {},
      create: { name: "empleado" }
    })
  ]);

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Administrador",
      passwordHash,
      roleId: adminRole.id
    }
  });

  const supplier = await prisma.supplier.upsert({
    where: { name_email: { name: "Proveedor Base", email: "proveedor@demo.com" } },
    update: {},
    create: {
      name: "Proveedor Base",
      contactName: "Juan Perez",
      email: "proveedor@demo.com",
      phone: "000-000-000"
    }
  });

  await prisma.product.upsert({
    where: { barcode: "BASE-001" },
    update: {},
    create: {
      name: "Producto Demo",
      barcode: "BASE-001",
      price: 25,
      currentStock: 50,
      supplierId: supplier.id,
      lowStockAlert: 8
    }
  });

  console.log("Seed completado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
