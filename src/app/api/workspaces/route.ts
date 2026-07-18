import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/workspaces?user_id=xxx
export async function GET(req: NextRequest) {
  const user_id = new URL(req.url).searchParams.get('user_id');

  let query = supabaseAdmin
    .from('workspaces')
    .select('*');

  if (user_id) {
    // Get workspaces that user is a member of
    const { data: memberOf } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user_id);
    
    const ids = (memberOf || []).map(m => m.workspace_id);
    if (ids.length > 0) {
      query = query.in('id', ids);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/workspaces — create new workspace
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, owner_id, color } = body;

  if (!name || !owner_id) {
    return NextResponse.json({ error: 'name and owner_id are required' }, { status: 400 });
  }

  // Create workspace
  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({ name, description, owner_id, color: color || '#ffcb3b' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Automatically add owner as admin member
  await supabaseAdmin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: owner_id,
    role: 'admin',
  });

  return NextResponse.json(workspace);
}
