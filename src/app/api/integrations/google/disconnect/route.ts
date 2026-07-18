import { NextResponse } from 'next/server';
import { deleteGoogleTokens } from '@/lib/google';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function POST() {
  try {
    await deleteGoogleTokens(DEFAULT_USER_ID);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
