import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function POST() {
  try {
    const { oauth2Client } = await getAuthenticatedClient(DEFAULT_USER_ID);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch Google Calendar events for the next 30 days
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];

    // Get existing CRM events with google_event_ids
    const { data: existingEvents } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID);

    const existingMap = new Map(
      (existingEvents || []).filter(e => e.google_event_id).map(e => [e.google_event_id, e])
    );

    let imported = 0;
    let skipped = 0;

    for (const ge of googleEvents) {
      if (!ge.id || !ge.start?.dateTime || !ge.end?.dateTime) continue;
      if (ge.status === 'cancelled') continue;

      const existing = existingMap.get(ge.id);
      if (existing) {
        skipped++;
        continue;
      }

      const isMeeting = ge.conferenceData?.createRequest?.conferenceSolutionKey?.type === 'hangoutsMeet'
        || !!ge.hangoutLink
        || (ge.description || '').toLowerCase().includes('meet');

      const eventType = isMeeting ? 'meeting' : 'task';
      const color = isMeeting ? '#f59e0b' : (ge.eventType === 'focusTime' ? '#ffb300' : '#ffcb3b');

      const { error } = await getSupabaseAdmin().from('calendar_events').insert({
        user_id: DEFAULT_USER_ID,
        title: ge.summary || 'Untitled Event',
        description: ge.description || null,
        event_type: eventType,
        start_time: ge.start.dateTime,
        end_time: ge.end.dateTime,
        color,
        meet_link: ge.hangoutLink || null,
        google_event_id: ge.id,
      });

      if (error) {
        console.error('Failed to import event:', error);
        continue;
      }
      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total_google_events: googleEvents.length,
    });
  } catch (err: any) {
    console.error('Google Calendar sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
