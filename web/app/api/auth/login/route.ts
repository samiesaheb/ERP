import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const API_URL = process.env.API_URL ?? '';

  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ error: 'Login failed' }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = await upstream.json();

  const res = NextResponse.json({ ok: true });
  // httpOnly: false so clientFetch can read the token for Authorization header.
  // This is an internal enterprise app — acceptable trade-off.
  res.cookies.set('token', data.token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return res;
}
