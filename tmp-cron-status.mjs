import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => !l.startsWith('#') && l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}

const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY);

const [i, u, pc] = await Promise.all([
  sb.from('intake_submissions').select('id, status, destination'),
  sb.from('manual_uploads').select('id, parsed'),
  sb.from('packages').select('id, title, status, start_date, end_date, expires_at'),
]);

console.log(JSON.stringify({
  intake: i.data,
  intakeErr: i.error?.message,
  uploads: u.data,
  uploadErr: u.error?.message,
  packages: pc.data,
  packagesErr: pc.error?.message,
}));
