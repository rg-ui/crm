import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// We store personal growth items as goals with priority='low' and a special description marker
const GROWTH_MARKER = '__personal_growth__';

// GET /api/personal-growth?user_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('goals')
    .select('*')
    .eq('user_id', user_id)
    .ilike('description', `${GROWTH_MARKER}%`)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/personal-growth
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, user_id } = body;

  if (!title || !user_id) return NextResponse.json({ error: 'title and user_id required' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('goals')
    .insert({
      title,
      description: `${GROWTH_MARKER}personal growth habit`,
      user_id,
      status: 'pending',
      progress: 0,
      priority: 'low',
      goal_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/personal-growth — toggle status
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (status === 'completed') {
    updates.progress = 100;
    updates.completed_at = new Date().toISOString();
  } else {
    updates.progress = 0;
    updates.completed_at = null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/personal-growth?id=xxx
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await getSupabaseAdmin().from('goals').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
