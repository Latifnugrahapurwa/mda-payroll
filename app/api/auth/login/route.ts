import { NextResponse } from "next/server";
import { constantTimeEqual, createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const password = process.env.MDA_ADMIN_PASSWORD;
  const secret = process.env.MDA_SESSION_SECRET;

  if (!password || password.length < 14 || !secret || secret.length < 32) {
    return NextResponse.json(
      { error: "Login belum dikonfigurasi. Atur MDA_ADMIN_PASSWORD (minimal 14 karakter) dan MDA_SESSION_SECRET (minimal 32 karakter) di Vercel." },
      { status: 503 },
    );
  }

  let submitted = "";
  try {
    const body = await request.json() as { password?: unknown };
    submitted = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  if (!constantTimeEqual(submitted, password)) {
    return NextResponse.json({ error: "Password bendahara tidak sesuai." }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
