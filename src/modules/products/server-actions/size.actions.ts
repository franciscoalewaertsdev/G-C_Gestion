"use server";

import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createGlobalSize, deleteGlobalSize } from "@/modules/products/services/size.service";

export async function createGlobalSizeAction(name: string) {
  await requireSession();
  const size = await createGlobalSize(name);
  revalidateTag("global-sizes");
  return size;
}

export async function deleteGlobalSizeAction(id: string) {
  await requireSession();
  await deleteGlobalSize(id);
  revalidateTag("global-sizes");
}
