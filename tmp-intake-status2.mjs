import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => !l.startsWith('#') && l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}
const anonKey = map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY;
const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', anonKey);

const { data } = await sb.from('intake_submissions').select('*').order('created_at', { ascending: false });
const byStatus = {};
for (const r of data || []) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log('intake_submissions by status:', JSON.stringify(byStatus));

const { data: up } = await sb.from('manual_uploads').select('id, parsed, created_at, caption');
console.log('manual_uploads:', JSON.stringify(up));

const { data: pkgs } = await sb.from('packages').select('id, title, destination, status, start_date, end_date, expires_at');
for (const p of pkgs || []) console.log('pkg:', JSON.stringify(p));
