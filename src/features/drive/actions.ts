"use server";

import { updateTag } from "next/cache";
import { getCurrentMember } from "@/lib/auth/member";
import { DRIVE_CACHE_TAG } from "./queries";

// "Actualizar" on /panel/recursos: drop the cached Drive listings so the next
// render fetches fresh data. Members only.
export async function refreshDrive(): Promise<void> {
  await getCurrentMember();
  updateTag(DRIVE_CACHE_TAG);
}
