import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

type ExportTarget = 'goals' | 'events' | 'expenses' | 'standups' | 'all';

async function getSheetData(target: ExportTarget) {
  if (target === 'goals' || target === 'all') {
    const { data } = await supabaseAdmin.from('goals').select('*').order('created_at', { ascending: false });
    if (data) {
      const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Progress', 'Goal Date', 'Due Date', 'Created At', 'Completed At'];
      const rows = data.map(g => [g.id, g.title, g.description || '', g.status, g.priority, String(g.progress), g.goal_date || '', g.due_date || '', g.created_at, g.completed_at || '']);
      return { name: 'Goals', headers, rows };
    }
  }

  if (target === 'events' || target === 'all') {
    const { data } = await supabaseAdmin.from('calendar_events').select('*').order('start_time', { ascending: false });
    if (data) {
      const headers = ['ID', 'Title', 'Description', 'Type', 'Start', 'End', 'Meet Link', 'Color'];
      const rows = data.map(e => [e.id, e.title, e.description || '', e.event_type, e.start_time, e.end_time, e.meet_link || '', e.color || '']);
      return { name: 'Events', headers, rows };
    }
  }

  if (target === 'standups' || target === 'all') {
    const { data } = await supabaseAdmin.from('standups').select('*').order('standup_date', { ascending: false });
    if (data) {
      const headers = ['ID', 'Date', 'Accomplished', 'Plan', 'Blockers', 'Morale'];
      const rows = data.map(s => [s.id, s.standup_date, s.accomplished || '', s.plan_for_tomorrow || '', s.blockers || '', String(s.morale_score || '')]);
      return { name: 'Standups', headers, rows };
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target: ExportTarget = body.target || 'all';
    const title = body.title || `StartupOS ${target === 'all' ? 'Full Export' : target.charAt(0).toUpperCase() + target.slice(1)}`;

    const { oauth2Client } = await getAuthenticatedClient(DEFAULT_USER_ID);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create spreadsheet');

    const targets: ExportTarget[] = target === 'all' ? ['goals', 'events', 'standups'] : [target];

    for (let i = 0; i < targets.length; i++) {
      const data = await getSheetData(targets[i]);
      if (!data) continue;

      const sheetTitle = i < 1 ? data.name : `${data.name} ${i + 1}`;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetTitle },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [data.headers, ...data.rows],
        },
      });
    }

    // Remove default Sheet1
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: { sheetId: 0 },
            },
          ],
        },
      });
    } catch { /* sheet already renamed */ }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (err: any) {
    console.error('Google Sheets export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
