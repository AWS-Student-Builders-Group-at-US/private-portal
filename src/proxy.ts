import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     * - _next/static, _next/image, favicon.ico and static image files
     * - checkin/... : the public QR check-in page (/checkin/[token]),
     *   which must never require login or touch the session.
     * - api/calendario.ics : the token-authenticated iCal feed polled by
     *   Google Calendar, which has no session cookies.
     */
    "/((?!_next/static|_next/image|favicon.ico|checkin/|api/calendario\\.ics|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
