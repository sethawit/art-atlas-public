import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Ticket 19 — the simplest mechanism proportional to actual need: a single shared admin
// password via HTTP Basic Auth, gating both /admin's pages and its Server Actions (a
// Server Action call is a POST back to the same page URL, so the same matcher covers it —
// there's no separate action route to also gate). No User/roles model exists (and none is
// needed yet — Passport stays account-free per §3), so a full auth system would be
// over-building for a single-operator MVP admin surface. Kept server-side only (§13):
// the password lives in ADMIN_PASSWORD, never sent to the client.
export function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  // Fail closed: if the operator hasn't set a password, admin stays unreachable rather
  // than silently open. Distinct from "not configured" going unnoticed in production.
  if (!expected) {
    return new NextResponse("Admin access is not configured — set ADMIN_PASSWORD.", { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [, password] = Buffer.from(encoded, "base64").toString("utf-8").split(":");
      if (password === expected) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Art Atlas admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
