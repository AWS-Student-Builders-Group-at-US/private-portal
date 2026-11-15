"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDriveFolderInput } from "@/features/drive/folder-input";
import { DRIVE_CACHE_TAG } from "@/features/drive/queries";

// Runs with the user's session; public.set_app_setting() rejects non-members.

export type DriveFolderFormState = { status: "idle" | "saved" | "error"; message?: string };

const ERRORS: Record<string, string> = {
  not_member: "No tienes permiso para cambiar los ajustes.",
  invalid_value: "El identificador de la carpeta no es válido.",
};

export async function saveDriveFolder(
  _prev: DriveFolderFormState,
  formData: FormData,
): Promise<DriveFolderFormState> {
  const raw = formData.get("folder");
  const folderId = typeof raw === "string" ? parseDriveFolderInput(raw) : null;
  if (!folderId) {
    return {
      status: "error",
      message: "Pega el enlace de una carpeta de Drive (drive.google.com/drive/folders/…) o su identificador.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_app_setting", {
    p_key: "drive_folder_id",
    p_value: folderId,
  });
  if (error) {
    return { status: "error", message: ERRORS[error.message] ?? "No se pudo guardar la carpeta." };
  }
  updateTag(DRIVE_CACHE_TAG);
  revalidatePath("/panel/ajustes");
  revalidatePath("/panel/recursos");
  return { status: "saved", message: "Carpeta guardada." };
}
