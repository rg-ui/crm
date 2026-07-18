import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spreadsheetId, range } = body;

    if (!spreadsheetId || !range) {
      return NextResponse.json({ error: 'spreadsheetId and range are required' }, { status: 400 });
    }

    const { oauth2Client } = await getAuthenticatedClient(DEFAULT_USER_ID);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'Sheet has no data rows' }, { status: 400 });
    }

    const headers = rows[0].map((h: string) => h.toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    let imported = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const record: Record<string, any> = {};
      headers.forEach((header: string, idx: number) => {
        record[header] = row[idx] || '';
      });

      if (record.title && (record.start_time || record.start) && (record.end_time || record.end)) {
        const startTime = record.start_time || record.start;
        const endTime = record.end_time || record.end;

        const { error } = await getSupabaseAdmin().from('calendar_events').insert({
          user_id: DEFAULT_USER_ID,
          title: record.title,
          description: record.description || record.type || null,
          event_type: record.type === 'meeting' || record.type === 'deep_work' || record.type === 'standup' ? record.type : 'task',
          start_time: startTime,
          end_time: endTime,
          meet_link: record.meet_link || record.meeting_link || null,
        });

        if (error) {
          skipped++;
        } else {
          imported++;
        }
      } else if (record.title) {
        const { error } = await getSupabaseAdmin().from('goals').insert({
          user_id: DEFAULT_USER_ID,
          title: record.title,
          description: record.description || null,
          status: record.status === 'completed' ? 'completed' : record.status === 'in_progress' ? 'in_progress' : 'pending',
          priority: record.priority || 'medium',
          progress: parseInt(record.progress) || 0,
          goal_date: record.goal_date || record.date || new Date().toISOString().split('T')[0],
        });

        if (error) {
          skipped++;
        } else {
          imported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total_rows: dataRows.length,
    });
  } catch (err: any) {
    console.error('Google Sheets import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
