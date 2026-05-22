import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

const cookieOpts = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24,
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) redirect('/login?error=oauth_failed');

  const _rawUrl = process.env.API_URL ?? '';
  const API_URL = _rawUrl && !_rawUrl.startsWith('http') ? `https://${_rawUrl}` : _rawUrl;

  const cookieStore = await cookies();
  cookieStore.set('token', token, cookieOpts);

  // Resolve company context
  const companiesRes = await fetch(`${API_URL}/api/v1/users/me/companies`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!companiesRes?.ok) redirect('/');

  const companies: { company_id: string }[] = await companiesRes.json();

  if (companies.length === 0) {
    redirect('/');
  } else if (companies.length === 1) {
    const selectRes = await fetch(`${API_URL}/auth/select-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ company_id: companies[0].company_id }),
    }).catch(() => null);

    if (selectRes?.ok) {
      const data = await selectRes.json();
      cookieStore.set('token', data.token, cookieOpts);
    }
    redirect('/');
  } else {
    redirect('/company-select');
  }
}
