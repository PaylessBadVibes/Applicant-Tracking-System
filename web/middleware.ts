import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "__session";

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    const url = new URL("/sign-in", req.url);
    if (req.nextUrl.pathname !== "/") {
      url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!sign-in|_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
