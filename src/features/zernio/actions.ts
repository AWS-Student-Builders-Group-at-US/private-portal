"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { isZernioConfigured } from "./client";
import { syncRecentZernioPosts } from "./sync";

const DAY_MS = 24 * 60 * 60 * 1000;

// "Sincronizar ahora" in Ajustes: members only (getCurrentMember redirects
// anyone else), then the server-only sync of the last 30 days.
export async function syncZernioNow(): Promise<ActionResult<{ synced: number }>> {
  await getCurrentMember();
  if (!isZernioConfigured()) {
    return { ok: false, message: "Falta configurar ZERNIO_API_KEY en el servidor." };
  }
  const result = await syncRecentZernioPosts(new Date(Date.now() - 30 * DAY_MS));
  revalidatePath("/panel/publicaciones");
  revalidatePath("/panel/ajustes");
  if (!result.ok) {
    return { ok: false, message: "No se pudo sincronizar todo con Zernio. Inténtalo de nuevo más tarde." };
  }
  return { ok: true, data: { synced: result.synced } };
}
