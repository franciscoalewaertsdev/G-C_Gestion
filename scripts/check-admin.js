const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: "admin" },
    include: { role: true }
  });

  if (!user) {
    console.log("admin_missing");
    return;
  }

  console.log(`admin:${user.username} role:${user.role.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
