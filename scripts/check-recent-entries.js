const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.stockEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      entryDate: true,
      createdAt: true,
      supplier: { select: { name: true } },
      _count: { select: { items: true } }
    }
  });

  if (entries.length === 0) {
    console.log("No hay ingresos en la base de datos.");
    return;
  }

  console.log("Ultimos 5 ingresos (por fecha de creacion):\n");
  console.log("Creado en (UTC)       | Proveedor            | Items | Fecha albaran");
  console.log("----------------------|----------------------|-------|---------------");
  for (const e of entries) {
    const creado = e.createdAt.toISOString().slice(0, 19).replace("T", " ");
    const albaran = e.entryDate.toISOString().slice(0, 10);
    const proveedor = e.supplier.name.padEnd(20).slice(0, 20);
    const items = String(e._count.items).padStart(5);
    console.log(`${creado} | ${proveedor} | ${items} | ${albaran}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
