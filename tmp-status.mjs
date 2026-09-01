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
if (!anon) { console.log('NO KEY FOUND'); process.exit(1); }
const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', anon);
const [i, p, m] = await Promise.all([
  sb.from('intake_submissions').select('status,created_at'),
  sb.from('packages').select('id,destination,title,status,expires_at'),
  sb.from('manual_uploads').select('id,parsed,created_at')
]);
const now = new Date();
console.log(JSON.stringify({
  intake: i.data,
  pkgActive: p.data?.filter(x => new Date(x.expires_at) > now).map(x => ({ id: x.id, dest: x.destination, title: x.title, exp: x.expires_at })),
  pkgExpired: (p.data?.length || 0) - (p.data?.filter(x => new Date(x.expires_at) > now).length || 0),
  manual: m.data
}, null, 1));
