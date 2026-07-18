import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars. Run with:\n  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-schema.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const schema = readFileSync(join(__dirname, '../supabase-schema.sql'), 'utf8');
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute...\n`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  if (!stmt.trim()) continue;

  console.log(`[${i + 1}/${statements.length}] ${stmt.substring(0, 80).replace(/\n/g, ' ')}...`);

  const { error } = await supabase.rpc('exec_sql', { query: stmt });

  if (error) {
    console.log(`  ⚠️  ${error.message}`);
  } else {
    console.log(`  ✅`);
  }
}

console.log('\n✅ Schema migration complete!');
