import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all workspaces
    const { data: workspaces, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('*');
    if (wsError) throw wsError;

    // 2. Fetch goals for today (optionally filtered by user)
    let goalsQuery = supabaseAdmin.from('goals').select('*').eq('goal_date', today);
    if (user_id) goalsQuery = goalsQuery.eq('user_id', user_id);
    const { data: goals, error: goalsError } = await goalsQuery;
    if (goalsError) throw goalsError;

    // 3. Fetch standups for today (optionally filtered by user)
    let standupsQuery = supabaseAdmin.from('standups').select('*').eq('standup_date', today);
    if (user_id) standupsQuery = standupsQuery.eq('user_id', user_id);
    const { data: standups, error: standupsError } = await standupsQuery;
    if (standupsError) throw standupsError;

    // 4. Fetch OKRs
    const { data: okrs, error: okrsError } = await supabaseAdmin
      .from('okrs')
      .select('*');
    if (okrsError) throw okrsError;

    // Calculate workspaces progress
    const workspaceStats = (workspaces || []).map(ws => {
      const wsGoals = (goals || []).filter(g => g.workspace_id === ws.id);
      const completed = wsGoals.filter(g => g.status === 'completed').length;
      const total = wsGoals.length;
      
      return {
        id: ws.id,
        name: ws.name,
        color: ws.color,
        completed,
        total,
      };
    });

    // Calculate Burnout / Morale Barometer
    let averageMorale = 5.0;
    let highWorkloadCount = 0;
    if (standups && standups.length > 0) {
      const scores = standups.map(s => s.morale_score).filter(Boolean) as number[];
      averageMorale = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 5.0;
      highWorkloadCount = standups.filter(s => s.morale_score && s.morale_score <= 2).length;
    }

    // Generate Dynamic Executive Brief from standups
    let brief = "All teams are running smoothly today. No blockers reported.";
    const blockers = (standups || [])
      .map(s => s.blockers)
      .filter(b => b && b.trim().length > 0);
    
    if (blockers.length > 0) {
      brief = `Teammates have reported ${blockers.length} blocker(s) today: "${blockers.join('; ')}".`;
    }

    return NextResponse.json({
      workspaceStats,
      morale: {
        average: averageMorale,
        highWorkloadCount,
      },
      brief,
      okrs: okrs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
