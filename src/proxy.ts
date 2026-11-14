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
     */
    "/((?!_next/static|_next/image|favicon.ico|checkin/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
