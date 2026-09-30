import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = safeNextPath(requestedNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    if (process.env.NODE_ENV === "development") console.error("OAuth callback failed:", error.code ?? "unknown");
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "google_auth");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
