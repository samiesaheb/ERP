import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const _rawUrl = process.env.API_URL ?? '';
  const API_URL = _rawUrl && !_rawUrl.startsWith('http') ? `https://${_rawUrl}` : _rawUrl;

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

  const cookieOpts = {
    httpOnly: false, // intentional: client reads token for Authorization header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24,
  };

  const res = NextResponse.json({ ok: true, companies: data.companies ?? [] });
  res.cookies.set('token', data.token, cookieOpts);
  return res;
}
