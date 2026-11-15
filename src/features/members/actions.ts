"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/events/types";
import { getCurrentMember } from "@/lib/auth/member";
import { memberErrorMessage } from "./logic";
import { memberEmailSchema, memberFormSchema, memberUpdateSchema } from "./schema";
import type { MemberFormState } from "./types";

// Writes go through security definer RPCs (see 20261124010000_member_admin.sql)
// called with the member's own session; the database enforces every rule.

const revalidate = () => {
  revalidatePath("/panel/ajustes");
  // Member names appear across the panel (tasks, suggestions, calendar).
  revalidatePath("/panel", "layout");
};

function readValues(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    area: String(formData.get("area") ?? ""),
  };
}

export async function addMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values = readValues(formData);
  const parsed = memberFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa los datos del miembro.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_member", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_area: parsed.data.area,
  });
  if (error) return { message: memberErrorMessage(error.message), values };
  revalidate();
  return { ok: true };
}

export async function updateMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values = readValues(formData);
  const parsed = memberUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      message: "Revisa los datos del miembro.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  await getCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member", {
    p_email: parsed.data.email,
    p_name: parsed.data.name,
    p_area: parsed.data.area,
  });
  if (error) return { message: memberErrorMessage(error.message), values };
  revalidate();
  return { ok: true };
}

export async function removeMember(email: string): Promise<ActionResult> {
  const parsed = memberEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, message: memberErrorMessage("member_not_found") };
  const me = await getCurrentMember();
  if (me.email === parsed.data) return { ok: false, message: memberErrorMessage("cannot_remove_self") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_email: parsed.data });
  if (error) return { ok: false, message: memberErrorMessage(error.message) };
  revalidate();
  return { ok: true };
}
