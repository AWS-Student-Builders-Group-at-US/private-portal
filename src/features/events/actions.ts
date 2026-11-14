"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EVENT_FILES_BUCKET } from "./files";
import { MAX_EVENT_FILE_BYTES, eventFormSchema } from "./schema";
import type { ActionResult, EventFormState } from "./types";

// Every action runs with the user's session (server client, never
// the secret admin key); RLS rejects non-members. Updates and deletes that RLS
// filters out return no rows, which we report as "not found or no access".

const EVENTS_PATH = "/panel/eventos";
const eventPath = (id: string) => `${EVENTS_PATH}/${id}`;
const idSchema = z.uuid();

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function parseEventForm(formData: FormData) {
  const values = formValues(formData);
  const parsed = eventFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, values, row: parsed.data } as const;
  const state: EventFormState = {
    message: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(parsed.error).fieldErrors,
    values,
  };
  return { ok: false, state } as const;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert(parsed.row)
    .select("id")
    .single();
  if (error || !data) {
    return {
      message: "No se pudo crear el evento. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidatePath(EVENTS_PATH);
  redirect(`${eventPath(data.id)}?estado=creado`);
}

export async function updateEvent(
  id: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  if (!idSchema.safeParse(id).success) {
    return { message: "Evento no encontrado." };
  }
  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update(parsed.row)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return {
      message: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      values: parsed.values,
    };
  }

  revalidatePath(EVENTS_PATH);
  revalidatePath(eventPath(id));
  redirect(`${eventPath(id)}?estado=guardado`);
}

// Removes the event's Storage objects first (the FK cascade only removes the
// `event_files` rows), then the event row.
export async function deleteEvent(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: "Evento no encontrado." };
  }
  const supabase = await createClient();
  const storage = supabase.storage.from(EVENT_FILES_BUCKET);

  const { data: files, error: filesError } = await supabase
    .from("event_files")
    .select("storage_path")
    .eq("event_id", id);
  // Also catch objects whose metadata row was never written.
  const { data: objects, error: listError } = await storage.list(id, {
    limit: 1000,
  });
  if (filesError || listError) {
    return { ok: false, message: "No se pudieron revisar los archivos del evento." };
  }

  const paths = new Set([
    ...files.map((file) => file.storage_path as string),
    ...objects.map((object) => `${id}/${object.name}`),
  ]);
  if (paths.size > 0) {
    const { error } = await storage.remove([...paths]);
    if (error) {
      return {
        ok: false,
        message: "No se pudieron borrar los archivos. El evento no se ha eliminado.",
      };
    }
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "No se pudo eliminar el evento." };
  }

  revalidatePath(EVENTS_PATH);
  redirect(`${EVENTS_PATH}?estado=eliminado`);
}

const registerFileSchema = z.object({
  eventId: z.uuid(),
  storagePath: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(300),
  sizeBytes: z.number().int().min(0).max(MAX_EVENT_FILE_BYTES),
  contentType: z.string().max(200).nullable(),
});

// Called by the browser after it uploaded the object to Storage itself
// (uploads bypass server actions because of the ~4.5 MB body limit).
export async function registerEventFile(
  input: z.input<typeof registerFileSchema>,
): Promise<ActionResult> {
  const parsed = registerFileSchema.safeParse(input);
  if (
    !parsed.success ||
    !parsed.data.storagePath.startsWith(`${parsed.data.eventId}/`)
  ) {
    return { ok: false, message: "Datos de archivo no válidos." };
  }
  const { eventId, storagePath, fileName, sizeBytes, contentType } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("event_files").insert({
    event_id: eventId,
    storage_path: storagePath,
    file_name: fileName,
    size_bytes: sizeBytes,
    content_type: contentType,
  });
  if (error) {
    return { ok: false, message: `No se pudo registrar «${fileName}».` };
  }

  revalidatePath(EVENTS_PATH);
  revalidatePath(eventPath(eventId));
  return { ok: true };
}

// Returns a signed download URL valid for 60 seconds.
export async function getEventFileDownloadUrl(
  fileId: string,
): Promise<ActionResult<string>> {
  if (!idSchema.safeParse(fileId).success) {
    return { ok: false, message: "Archivo no encontrado." };
  }
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("event_files")
    .select("storage_path, file_name")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return { ok: false, message: "Archivo no encontrado." };

  const { data, error } = await supabase.storage
    .from(EVENT_FILES_BUCKET)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });
  if (error || !data) {
    return { ok: false, message: "No se pudo generar el enlace de descarga." };
  }
  return { ok: true, data: data.signedUrl };
}

export async function deleteEventFile(fileId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(fileId).success) {
    return { ok: false, message: "Archivo no encontrado." };
  }
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("event_files")
    .select("event_id, storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return { ok: false, message: "Archivo no encontrado." };

  const { error: storageError } = await supabase.storage
    .from(EVENT_FILES_BUCKET)
    .remove([file.storage_path]);
  if (storageError) {
    return { ok: false, message: "No se pudo borrar el archivo." };
  }
  const { error } = await supabase.from("event_files").delete().eq("id", fileId);
  if (error) {
    return { ok: false, message: "No se pudo borrar el registro del archivo." };
  }

  revalidatePath(EVENTS_PATH);
  revalidatePath(eventPath(file.event_id));
  return { ok: true };
}
