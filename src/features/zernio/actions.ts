"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { isZernioConfigured } from "./client";
import { syncPostMetrics } from "./metrics-sync";
import { syncRecentZernioPosts } from "./sync";

const DAY_MS = 24 * 60 * 60 * 1000;

// "Sincronizar ahora" in Ajustes: members only (getCurrentMember redirects
// anyone else), then the server-only sync of the last 30 days and the latest
// insights (post_metrics).
export async function syncZernioNow(): Promise<ActionResult<{ synced: number }>> {
  await getCurrentMember();
  if (!isZernioConfigured()) {
    return { ok: false, message: "Falta configurar ZERNIO_API_KEY en el servidor." };
  }
  const result = await syncRecentZernioPosts(new Date(Date.now() - 30 * DAY_MS));
  const metrics = await syncPostMetrics();
  revalidatePath("/panel/publicaciones", "layout");
  revalidatePath("/panel/ajustes");
  if (!result.ok) {
    return { ok: false, message: "No se pudo sincronizar todo con Zernio. Inténtalo de nuevo más tarde." };
  }
  if (metrics.addonRequired) {
    return {
      ok: false,
      message: "Publicaciones sincronizadas, pero las métricas requieren el complemento de Analytics de Zernio.",
    };
  }
  if (!metrics.ok) {
    return { ok: false, message: "Publicaciones sincronizadas, pero no se pudieron actualizar las métricas." };
  }
  return { ok: true, data: { synced: result.synced } };
}
