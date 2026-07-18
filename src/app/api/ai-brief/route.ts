import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('No Gemini API key configured');

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function smartFallback(goals: any[], standups: any[], morale: number): string {
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const blockers = standups.map(s => s.blockers).filter(Boolean);
  const pct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const lines = [];
  if (standups.length === 0) {
    lines.push('No standup submitted today yet.');
    if (totalGoals > 0) lines.push(`${completedGoals}/${totalGoals} goals completed (${pct}%).`);
    lines.push('Submit your daily standup to generate a richer AI brief.');
  } else {
    if (morale >= 4) lines.push('Team morale is excellent today! 🎉');
    else if (morale >= 3) lines.push('Team morale is steady.');
    else lines.push('⚠️ Team morale is low — check in with teammates.');

    if (totalGoals > 0) lines.push(`${completedGoals}/${totalGoals} goals completed (${pct}%).`);

    if (blockers.length > 0) {
      lines.push(`${blockers.length} blocker(s) reported: "${blockers.slice(0, 2).join('; ')}"`);
    } else {
      lines.push('No blockers reported. All systems go! ✅');
    }
  }
  return lines.join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's goals
    let goalsQ = getSupabaseAdmin().from('goals').select('*').eq('goal_date', today);
    if (user_id) goalsQ = goalsQ.eq('user_id', user_id);
    const { data: goals } = await goalsQ;

    // Fetch today's standups
    let standupsQ = getSupabaseAdmin().from('standups').select('*').eq('standup_date', today);
    if (user_id) standupsQ = standupsQ.eq('user_id', user_id);
    const { data: standups } = await standupsQ;

    const goalsArr = goals || [];
    const standupsArr = standups || [];

    const completed = goalsArr.filter((g: any) => g.status === 'completed').length;
    const scores = standupsArr.map((s: any) => s.morale_score).filter(Boolean) as number[];
    const avgMorale = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;

    // Try Gemini; fallback gracefully
    if (GEMINI_API_KEY && standupsArr.length > 0) {
      try {
        const accomplishments = standupsArr.map((s: any) => s.accomplished).filter(Boolean).join('; ');
        const plans = standupsArr.map((s: any) => s.plan_for_tomorrow).filter(Boolean).join('; ');
        const blockers = standupsArr.map((s: any) => s.blockers).filter(Boolean).join('; ');

        const prompt = `You are a startup operating system AI. Generate a concise 2-3 sentence executive brief for today (${today}) based on the following data. Be specific, insightful, and actionable. Write in plain English — no markdown, no bullet points.

Today's Data:
- Goals: ${goalsArr.length} total, ${completed} completed
- Team morale score: ${avgMorale.toFixed(1)}/5
- Accomplished today: ${accomplishments || 'Nothing reported yet'}
- Plans for tomorrow: ${plans || 'None specified'}
- Blockers: ${blockers || 'None reported'}

Executive Brief:`;

        const brief = await callGemini(prompt);
        return NextResponse.json({ brief, source: 'gemini' });
      } catch (geminiErr) {
        console.error('Gemini failed, using fallback:', geminiErr);
        // Fall through to smart fallback
      }
    }

    const brief = smartFallback(goalsArr, standupsArr, avgMorale);
    return NextResponse.json({ brief, source: 'fallback' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — manually refresh the AI brief
export async function POST(req: NextRequest) {
  return GET(req);
}
