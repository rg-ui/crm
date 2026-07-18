import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/goals?workspace_id=xxx&user_id=xxx&date=2024-01-01
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspace_id = searchParams.get('workspace_id');
  const user_id = searchParams.get('user_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  let query = getSupabaseAdmin()
    .from('goals')
    .select('*')
    .eq('goal_date', date)
    .order('created_at', { ascending: false });

  if (workspace_id) query = query.eq('workspace_id', workspace_id);
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/goals
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, workspace_id, user_id, goal_date, due_date, priority } = body;

  if (!title || !user_id) {
    return NextResponse.json({ error: 'title and user_id are required' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('goals')
    .insert({ title, description, workspace_id, user_id, goal_date: goal_date || new Date().toISOString().split('T')[0], due_date, priority })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/goals  – update status/progress
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, progress, title, description } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === 'completed') updates.completed_at = new Date().toISOString();
  }
  if (progress !== undefined) updates.progress = progress;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;

  const { data, error } = await getSupabaseAdmin()
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/goals?id=xxx
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await getSupabaseAdmin().from('goals').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
