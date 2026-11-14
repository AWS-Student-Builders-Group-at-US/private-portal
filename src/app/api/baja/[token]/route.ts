import { unsubscribeByToken } from "@/features/emails/unsubscribe";

// RFC 8058 one-click unsubscribe target (List-Unsubscribe header). Mail
// clients POST `List-Unsubscribe=One-Click` here. Public, no session; the
// response is the same for any token.
export async function POST(_req: Request, ctx: RouteContext<"/api/baja/[token]">) {
  const { token } = await ctx.params;
  try {
    await unsubscribeByToken(token);
  } catch {
    return new Response("Error", { status: 500 });
  }
  return new Response("OK", {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

// A person opening the header link in a browser gets the confirmation page;
// GET never unsubscribes (link scanners prefetch).
export async function GET(req: Request, ctx: RouteContext<"/api/baja/[token]">) {
  const { token } = await ctx.params;
  return Response.redirect(new URL(`/baja/${encodeURIComponent(token)}`, req.url), 303);
}
