const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function printUsage() {
  console.log("Uso:");
  console.log(
    "  node ./scripts/update-user-credentials.js --current=admin --username=nuevoUsuario --password=nuevaClave"
  );
  console.log("");
  console.log("Opcional:");
  console.log("  --fullname=\"Nombre Completo\"");
}

async function main() {
  const currentUsername = getArg("current") || "admin";
  const nextUsername = getArg("username");
  const nextPassword = getArg("password");
  const nextFullName = getArg("fullname");

  if (!nextUsername || !nextPassword) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username: currentUsername },
    select: { id: true, username: true }
  });

  if (!user) {
    throw new Error(`No existe un usuario con username '${currentUsername}'.`);
  }

  if (nextUsername !== currentUsername) {
    const existingTargetUsername = await prisma.user.findUnique({
      where: { username: nextUsername },
      select: { id: true }
    });

    if (existingTargetUsername) {
      throw new Error(`El username '${nextUsername}' ya esta en uso.`);
    }
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: nextUsername,
      passwordHash,
      ...(nextFullName ? { fullName: nextFullName } : {})
    },
    select: {
      id: true,
      username: true,
      fullName: true
    }
  });

  console.log("Credenciales actualizadas correctamente:");
  console.log(`- id: ${updated.id}`);
  console.log(`- username: ${updated.username}`);
  console.log(`- fullName: ${updated.fullName}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
