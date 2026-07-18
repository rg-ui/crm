import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuth2Client, storeGoogleTokens } from '@/lib/google';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/settings?integration=google&status=error&message=' + error, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?integration=google&status=error&message=No+authorization+code', req.url)
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await storeGoogleTokens(DEFAULT_USER_ID, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    });

    // Fetch user email from Google
    try {
      oauth2Client.setCredentials({ access_token: tokens.access_token! });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo.data.email) {
        await getSupabaseAdmin()
          .from('user_integrations')
          .update({ metadata: { email: userInfo.data.email, name: userInfo.data.name, picture: userInfo.data.picture } })
          .eq('user_id', DEFAULT_USER_ID)
          .eq('provider', 'google');
      }
    } catch { /* email fetch is optional */ }

    return NextResponse.redirect(
      new URL('/settings?integration=google&status=connected', req.url)
    );
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings?integration=google&status=error&message=' + encodeURIComponent(err.message), req.url)
    );
  }
}
