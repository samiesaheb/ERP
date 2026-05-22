import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json(); // { company_id: string }
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const _rawUrl = process.env.API_URL ?? '';
  const API_URL = _rawUrl && !_rawUrl.startsWith('http') ? `https://${_rawUrl}` : _rawUrl;

  const upstream = await fetch(`${API_URL}/auth/select-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ error: 'Failed to select company' }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = await upstream.json();

  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', data.token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return res;
}
