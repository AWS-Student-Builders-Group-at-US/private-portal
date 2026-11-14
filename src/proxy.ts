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
     * - baja/... and api/baja/... : public email unsubscribe page and its
     *   RFC 8058 one-click endpoint; same rule as check-in.
     * - api/calendario.ics : the token-authenticated iCal feed polled by
     *   Google Calendar, which has no session cookies.
     */
    "/((?!_next/static|_next/image|favicon.ico|checkin/|baja/|api/baja/|api/calendario\\.ics|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
