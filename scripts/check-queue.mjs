import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => !l.startsWith('#') && l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}

const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY);

const { data: intake, error: e1 } = await sb.from('intake_submissions').select('*').order('created_at', { ascending: true });
console.log('intake_submissions:', e1 ? e1.message : (intake || []).length);
if (!e1) {
  const byStatus = {};
  for (const r of intake || []) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log('by status:', JSON.stringify(byStatus));
}

const { data: uploads, error: e2 } = await sb.from('manual_uploads').select('id, parsed, created_at, caption').order('created_at', { ascending: true });
console.log('manual_uploads:', e2 ? e2.message : (uploads || []).length);
if (!e2) {
  const unparsed = (uploads || []).filter(u => u.parsed === false);
  console.log('unparsed uploads:', unparsed.length);
}
