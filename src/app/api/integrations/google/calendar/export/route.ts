import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id } = body;
    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    const { oauth2Client } = await getAuthenticatedClient(DEFAULT_USER_ID);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const { data: event } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

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
    const meetLink = created.hangoutLink || null;

    const { error: updateError } = await getSupabaseAdmin()
      .from('calendar_events')
      .update({
        google_event_id: created.id,
        meet_link: meetLink,
      })
      .eq('id', event_id);

    if (updateError) {
      console.error('Failed to update event with Google IDs:', updateError);
    }

    return NextResponse.json({
      success: true,
      google_event_id: created.id,
      meet_link: meetLink,
      html_link: created.htmlLink,
    });
  } catch (err: any) {
    console.error('Google Calendar export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
