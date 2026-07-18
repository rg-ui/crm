import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars. Run with:\n  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-schema.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const tables = ['workspaces', 'workspace_members', 'profiles', 'goals', 'calendar_events', 'standups', 'okrs'];

console.log('Checking Supabase tables...\n');

for (const table of tables) {
  const { error } = await supabase.from(table).select('id').limit(1);
  if (error) {
    console.log(`❌ Table '${table}' does not exist yet: ${error.message}`);
  } else {
    console.log(`✅ Table '${table}' exists and is accessible`);
  }
}

console.log('\nDone!');
