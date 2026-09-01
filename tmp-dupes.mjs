import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => !l.startsWith('#') && l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}
let anon = map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY || '';
if (!anon) {
  const mainEnv = fs.readFileSync('../.env', 'utf8');
  for (const line of mainEnv.split('\n')) {
    const m = line.match(/^SUPABASE_(ANON_KEY|SERVICE_ROLE_KEY)\s*=\s*(.*)$/);
    if (m) map[m[1]] = m[2].replace(/["']/g, '').trim();
  }
  anon = map.SUPABASE_ANON_KEY || map.SUPABASE_SERVICE_ROLE_KEY || '';
}
const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', anon);
const { data } = await sb.from('packages').select('*').in('id', [
  'cbc081d6-1436-45c0-b1fb-51a046a39f44',
  'e85bc105-1b71-47da-a289-3308bda04780',
  '292d6d57-36f5-44b7-aa4f-5072830a8802',
  '97842c6b-a6ab-4ebe-84a0-19f80b869c91'
]);
for (const p of data) {
  const { count: deals } = await sb.from('deals').select('*', { count: 'exact', head: true }).eq('package_id', p.id);
  const { count: extras } = await sb.from('extras').select('*', { count: 'exact', head: true }).eq('package_id', p.id);
  console.log(JSON.stringify({ id: p.id, title: p.title, status: p.status, created: p.created_at, updated: p.updated_at, travel: p.travel_dates || p.dates || null, deals, extras }));
}
