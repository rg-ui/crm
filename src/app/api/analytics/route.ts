import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_USER_ID } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id') || DEFAULT_USER_ID;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const twentyEightDaysAgo = new Date(today);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    twentyEightDaysAgo.setHours(0, 0, 0, 0);

    // Fetch completed goals in last 7 days
    const { data: weeklyGoals, error: goalsErr } = await getSupabaseAdmin()
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgo.toISOString())
      .lte('completed_at', today.toISOString());
    if (goalsErr) throw goalsErr;

    // Fetch completed goals for streak (last 60 days)
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    sixtyDaysAgo.setHours(0, 0, 0, 0);
    const { data: streakGoals, error: streakErr } = await getSupabaseAdmin()
      .from('goals')
      .select('completed_at')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('completed_at', sixtyDaysAgo.toISOString())
      .lte('completed_at', today.toISOString())
      .order('completed_at', { ascending: false });
    if (streakErr) throw streakErr;

    // Fetch deep work events in last 7 days
    const { data: dwEvents, error: dwErr } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('*')
      .eq('user_id', user_id)
      .eq('event_type', 'deep_work')
      .gte('start_time', sevenDaysAgo.toISOString())
      .lte('start_time', today.toISOString());
    if (dwErr) throw dwErr;

    // Fetch completed goals for weekly breakdown (last 28 days)
    const { data: monthGoals, error: monthErr } = await getSupabaseAdmin()
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .gte('goal_date', twentyEightDaysAgo.toISOString().split('T')[0])
      .lte('goal_date', today.toISOString().split('T')[0]);
    if (monthErr) throw monthErr;

    // Fetch all goals for last 28 days for completion rate
    const { data: allGoals, error: allErr } = await getSupabaseAdmin()
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .gte('goal_date', twentyEightDaysAgo.toISOString().split('T')[0])
      .lte('goal_date', today.toISOString().split('T')[0]);
    if (allErr) throw allErr;

    // 1. Weekly goals completed count
    const weeklyGoalsCompleted = weeklyGoals?.length || 0;

    // 2. Deep work hours
    const deepWorkHours = (dwEvents || []).reduce((total, ev) => {
      const start = new Date(ev.start_time).getTime();
      const end = new Date(ev.end_time).getTime();
      return total + (end - start) / (1000 * 60 * 60);
    }, 0);

    // 3. Current streak
    const streak = computeStreak(streakGoals || []);

    // 4. Weekly velocity (last 7 days by day-name)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const velocityMap: Record<string, { goals: number; deepWork: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dayNames[d.getDay()];
      velocityMap[key] = { goals: 0, deepWork: 0 };
    }

    (weeklyGoals || []).forEach(g => {
      const d = new Date(g.completed_at);
      const key = dayNames[d.getDay()];
      if (velocityMap[key]) velocityMap[key].goals++;
    });

    (dwEvents || []).forEach(ev => {
      const d = new Date(ev.start_time);
      const key = dayNames[d.getDay()];
      if (velocityMap[key]) {
        const start = new Date(ev.start_time).getTime();
        const end = new Date(ev.end_time).getTime();
        velocityMap[key].deepWork += (end - start) / (1000 * 60 * 60);
      }
    });

    const weeklyVelocity = dayNames.filter(d => velocityMap[d]).map(name => ({
      name,
      goals: Math.round(velocityMap[name].goals * 10) / 10,
      deepWork: Math.round(velocityMap[name].deepWork * 10) / 10,
    }));

    // 5. Completion rate by week (last 4 weeks)
    const completionRate = computeCompletionRate(allGoals || [], 4);
    const goalsCompletedDiff = computeGoalsDiff(monthGoals || []);

    // 6. Compare with previous week
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const { data: prevWeekGoals, error: prevErr } = await getSupabaseAdmin()
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('completed_at', fourteenDaysAgo.toISOString())
      .lt('completed_at', sevenDaysAgo.toISOString());
    if (prevErr) throw prevErr;

    const prevWeekCount = prevWeekGoals?.length || 0;
    const goalChange = prevWeekCount > 0
      ? Math.round(((weeklyGoalsCompleted - prevWeekCount) / prevWeekCount) * 100)
      : weeklyGoalsCompleted > 0 ? 100 : 0;

    return NextResponse.json({
      weeklyGoalsCompleted,
      deepWorkHours: Math.round(deepWorkHours * 10) / 10,
      streak,
      goalChange,
      weeklyVelocity,
      completionRate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function computeStreak(goals: { completed_at: string }[]): number {
  if (!goals.length) return 0;

  const days = new Set<string>();
  goals.forEach(g => {
    const d = new Date(g.completed_at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function computeCompletionRate(goals: any[], numWeeks: number) {
  const today = new Date();
  const weeks: { name: string; total: number; completed: number }[] = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - (w * 7));
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekGoals = goals.filter(g => {
      const d = new Date(g.goal_date || g.created_at);
      return d >= weekStart && d <= weekEnd;
    });

    const total = weekGoals.length;
    const completed = weekGoals.filter(g => g.status === 'completed').length;

    weeks.push({
      name: `Week ${numWeeks - w}`,
      total,
      completed,
    });
  }

  return weeks.map(w => ({
    name: w.name,
    completionRate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0,
  }));
}

function computeGoalsDiff(monthGoals: any[]) {
  if (!monthGoals || monthGoals.length < 4) return 0;
  const mid = Math.floor(monthGoals.length / 2);
  const firstHalf = monthGoals.slice(0, mid).filter(g => g.status === 'completed').length;
  const secondHalf = monthGoals.slice(mid).filter(g => g.status === 'completed').length;
  if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}
