export type RemoveDecision = { ok: true } | { ok: false; reason: "self" | "last" };

// Mirrors the guards in public.remove_member(); the database stays the authority.
export function canRemoveMember({
  me,
  target,
  memberCount,
}: {
  me: string;
  target: string;
  memberCount: number;
}): RemoveDecision {
  if (me.toLowerCase() === target.toLowerCase()) return { ok: false, reason: "self" };
  if (memberCount <= 1) return { ok: false, reason: "last" };
  return { ok: true };
}

const ERROR_MESSAGES: Record<string, string> = {
  member_exists: "Ese correo ya tiene acceso al panel.",
  member_not_found: "Ese miembro no existe o ya se eliminó.",
  cannot_remove_self: "No puedes eliminar tu propia cuenta.",
  last_member: "No se puede eliminar al último miembro del panel.",
  invalid_email: "Escribe un correo válido.",
  invalid_name: "Escribe un nombre de como máximo 80 caracteres.",
  invalid_area: "Elige un área.",
  not_member: "No tienes acceso a esta acción.",
  not_common_account: "Solo la cuenta común del grupo puede gestionar miembros.",
  cannot_remove_common_account: "No se puede eliminar la cuenta común del grupo.",
};

const FALLBACK = "No se pudo completar la operación.";

// Maps the error codes raised by the member RPCs to Spanish copy.
export function memberErrorMessage(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || FALLBACK;
}
