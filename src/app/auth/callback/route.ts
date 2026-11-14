import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (PKCE) callback: exchanges the code for a session, then opens the member panel.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/panel`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
