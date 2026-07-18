import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// GET /api/tomorrow-plan?user_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');

  const tomorrow = getTomorrowDate();

  let query = supabaseAdmin
    .from('goals')
    .select('*')
    .eq('goal_date', tomorrow)
    .order('created_at', { ascending: true });

  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/tomorrow-plan
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, priority, user_id } = body;

  if (!title || !user_id) {
    return NextResponse.json({ error: 'title and user_id are required' }, { status: 400 });
  }

  const tomorrow = getTomorrowDate();

  const { data, error } = await supabaseAdmin
    .from('goals')
    .insert({
      title,
      description: description || null,
      priority: priority || 'medium',
      user_id,
      status: 'pending',
      progress: 0,
      goal_date: tomorrow,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/tomorrow-plan
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, progress, title, priority } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (progress !== undefined) updates.progress = progress;
  if (title !== undefined) updates.title = title;
  if (priority !== undefined) updates.priority = priority;

  const { data, error } = await supabaseAdmin
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/tomorrow-plan?id=xxx
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('goals').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
