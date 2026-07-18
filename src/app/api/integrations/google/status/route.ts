import { NextResponse } from 'next/server';
import { getGoogleIntegration } from '@/lib/google';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function GET() {
  try {
    const integration = await getGoogleIntegration(DEFAULT_USER_ID);
    return NextResponse.json({
      connected: !!integration,
      email: integration?.metadata?.email || null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
