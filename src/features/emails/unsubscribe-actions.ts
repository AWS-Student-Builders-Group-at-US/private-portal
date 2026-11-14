"use server";

import { unsubscribeByToken } from "./unsubscribe";

export type UnsubscribeState = { status: "idle" | "done" | "error" };

// Confirmation button on /baja/<token>. Same generic answer for any token.
// Used with useActionState; the previous state and form data are ignored.
export async function confirmUnsubscribe(token: string): Promise<UnsubscribeState> {
  try {
    await unsubscribeByToken(String(token));
    return { status: "done" };
  } catch {
    return { status: "error" };
  }
}
