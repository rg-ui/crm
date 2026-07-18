import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

export type GoogleIntegration = {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'openid',
  'email',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  );
}

export async function getGoogleIntegration(userId: string): Promise<GoogleIntegration | null> {
  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !data) return null;
  return data as GoogleIntegration;
}

export async function getAuthenticatedClient(userId: string) {
  const integration = await getGoogleIntegration(userId);
  if (!integration) throw new Error('Google not connected');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token || undefined,
    expiry_date: integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) update.token_expires_at = new Date(tokens.expiry_date).toISOString();

    await supabaseAdmin
      .from('user_integrations')
      .update(update)
      .eq('user_id', userId)
      .eq('provider', 'google');
  });

  return { oauth2Client, integration };
}

export async function storeGoogleTokens(
  userId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null; scope?: string | null }
) {
  const { error } = await supabaseAdmin.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scope: tokens.scope,
      metadata: {},
    },
    { onConflict: 'user_id, provider' }
  );

  if (error) throw error;
}

export async function deleteGoogleTokens(userId: string) {
  const { error } = await supabaseAdmin
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google');

  if (error) throw error;
}
