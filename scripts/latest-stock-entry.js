const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const entry = await prisma.stockEntry.findFirst({ orderBy: { entryDate: "desc" } });
  console.log(entry ? entry.id : "");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
