import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This route creates all the database tables via direct PostgreSQL connection
// Access: GET /api/init  (only run once to set up the schema)

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.includes('[YOUR-DB-PASSWORD]')) {
    return NextResponse.json({ 
      error: 'DATABASE_URL not configured. Please add it to .env.local',
      hint: 'Get it from: Supabase Dashboard → Settings → Database → Connection string (Transaction mode)'
    }, { status: 500 });
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  const schema = `
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT,
      color TEXT DEFAULT '#ffcb3b',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      email TEXT,
      avatar_url TEXT,
      role_title TEXT,
      skills TEXT[],
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Migration for existing databases
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

    CREATE TABLE IF NOT EXISTS workspace_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT,
      role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      goal_date DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'task' CHECK (event_type IN ('task', 'meeting', 'deep_work', 'standup')),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      color TEXT DEFAULT '#ffcb3b',
      meet_link TEXT,
      google_event_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS standups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      accomplished TEXT,
      plan_for_tomorrow TEXT,
      blockers TEXT,
      morale_score INT CHECK (morale_score >= 1 AND morale_score <= 5),
      standup_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS okrs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      objective TEXT NOT NULL,
      progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      quarter TEXT,
      year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      scope TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, provider)
    );
  `;

  try {
    const client = await pool.connect();
    await client.query(schema);
    client.release();
    await pool.end();

    return NextResponse.json({ 
      success: true, 
      message: 'All tables created successfully!',
      tables: ['workspaces', 'profiles', 'workspace_members', 'goals', 'calendar_events', 'standups', 'okrs', 'user_integrations']
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
