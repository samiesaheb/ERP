import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    redirect('/login?error=oauth_failed');
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
