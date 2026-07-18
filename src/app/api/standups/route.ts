import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/standups?user_id=xxx&workspace_id=xxx&date=2024-01-01
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  const workspace_id = searchParams.get('workspace_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    let query = getSupabaseAdmin()
      .from('standups')
      .select('*')
      .eq('standup_date', date)
      .order('created_at', { ascending: false });

    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/standups
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, workspace_id, accomplished, plan_for_tomorrow, blockers, morale_score } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const wsId = workspace_id || null;

    // If no workspace, clean up any existing null-workspace standup for this user+date
    if (!wsId) {
      await getSupabaseAdmin()
        .from('standups')
        .delete()
        .eq('user_id', user_id)
        .eq('standup_date', today)
        .is('workspace_id', null);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('standups')
      .upsert({
        user_id,
        workspace_id: wsId,
        accomplished,
        plan_for_tomorrow,
        blockers,
        morale_score,
        standup_date: today,
      }, { onConflict: 'user_id,workspace_id,standup_date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
