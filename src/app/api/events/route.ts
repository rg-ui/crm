import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getGoogleIntegration, getOAuth2Client } from '@/lib/google';
import { DEFAULT_USER_ID } from '@/lib/constants';

async function syncToGoogleCalendar(event: any) {
  try {
    const integration = await getGoogleIntegration(event.user_id || DEFAULT_USER_ID);
    if (!integration) return;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const googleEvent: any = {
      summary: event.title,
      description: event.description || '',
      start: { dateTime: event.start_time, timeZone: 'Asia/Kolkata' },
      end: { dateTime: event.end_time, timeZone: 'Asia/Kolkata' },
    };

    if (event.event_type === 'meeting') {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: event.id,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
      conferenceDataVersion: event.event_type === 'meeting' ? 1 : 0,
    });

    const created = response.data;

    await getSupabaseAdmin()
      .from('calendar_events')
      .update({
        google_event_id: created.id,
        meet_link: created.hangoutLink || null,
      })
      .eq('id', event.id);

    return created;
  } catch (err) {
    console.error('Failed to sync to Google Calendar:', err);
  }
}

async function deleteFromGoogleCalendar(googleEventId: string) {
  try {
    const integration = await getGoogleIntegration(DEFAULT_USER_ID);
    if (!integration) return;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
  } catch (err) {
    console.error('Failed to delete from Google Calendar:', err);
  }
}

// GET /api/events?workspace_id=xxx&user_id=xxx&date=2024-01-01&range=7
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspace_id = searchParams.get('workspace_id');
  const user_id = searchParams.get('user_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const range = parseInt(searchParams.get('range') || '1');

  const startOfDay = `${date}T00:00:00.000Z`;
  const endDate = new Date(new Date(date).getTime() + range * 24 * 60 * 60 * 1000);
  const endOfRange = `${endDate.toISOString().split('T')[0]}T23:59:59.999Z`;

  let query = getSupabaseAdmin()
    .from('calendar_events')
    .select('*')
    .gte('start_time', startOfDay)
    .lt('start_time', endOfRange)
    .order('start_time', { ascending: true });

  if (workspace_id) query = query.eq('workspace_id', workspace_id);
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/events
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, workspace_id, user_id, start_time, end_time, event_type, color } = body;

  if (!title || !user_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'title, user_id, start_time, end_time are required' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('calendar_events')
    .insert({ title, description, workspace_id, user_id, start_time, end_time, event_type: event_type || 'task', color: color || '#ffcb3b' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// PATCH /api/events
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, title, description, start_time, end_time, event_type, color, workspace_id } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (event_type !== undefined) updates.event_type = event_type;
  if (color !== undefined) updates.color = color;
  if (workspace_id !== undefined) updates.workspace_id = workspace_id;

  const { data, error } = await getSupabaseAdmin()
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/events?id=xxx
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data: event } = await getSupabaseAdmin()
    .from('calendar_events')
    .select('google_event_id')
    .eq('id', id)
    .single();

  const { error } = await getSupabaseAdmin().from('calendar_events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (event?.google_event_id) {
    deleteFromGoogleCalendar(event.google_event_id);
  }

  return NextResponse.json({ success: true });
}
