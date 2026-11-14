import { headers } from "next/headers";
import { memberClientOrNull, notFoundResponse } from "@/features/checkin/member-route";
import { qrPngBuffer } from "@/features/checkin/qr";
import { buildCheckinUrl, resolveSiteUrl } from "@/features/checkin/url";

// Member-only PNG download of the event's check-in QR.
export async function GET(_req: Request, ctx: RouteContext<"/panel/eventos/[id]/qr">) {
  const { id } = await ctx.params;
  const supabase = await memberClientOrNull();
  if (!supabase) return notFoundResponse();

  const { data: event } = await supabase
    .from("events")
    .select("checkin_token")
    .eq("id", id)
    .maybeSingle();
  if (!event) return notFoundResponse();

  const url = buildCheckinUrl(resolveSiteUrl(await headers()), event.checkin_token);
  const png = await qrPngBuffer(url);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="checkin-qr.png"',
      "Cache-Control": "private, no-store",
    },
  });
}
