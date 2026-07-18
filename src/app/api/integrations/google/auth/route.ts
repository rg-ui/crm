import { NextResponse } from 'next/server';
import { getOAuth2Client, SCOPES } from '@/lib/google';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local' },
      { status: 400 }
    );
  }

  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  return NextResponse.json({ url });
}
