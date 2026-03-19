import { prisma } from "@/db/prisma";

export async function listGlobalSizes() {
  return prisma.globalSize.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function createGlobalSize(name: string) {
  const trimmed = name.trim().toUpperCase();
  if (!trimmed) {
    throw new Error("El nombre del talle no puede estar vacio.");
  }

  const existing = await prisma.globalSize.findUnique({
    where: { name: trimmed }
  });

  if (existing) {
    throw new Error(`El talle "${trimmed}" ya existe.`);
  }

  return prisma.globalSize.create({
    data: { name: trimmed }
  });
}

export async function deleteGlobalSize(id: string) {
  return prisma.globalSize.delete({
    where: { id }
  });
}
