import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const map = {};
for (const line of env.split('\n').filter(l => !l.startsWith('#') && l.includes('='))) {
  const [k, ...rest] = line.split('=');
  map[k.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
}

const sb = createClient('https://bxrvfixjfjnxqqejgxdo.supabase.co', map.NEXT_PUBLIC_SUPABASE_ANON_KEY || map.SUPABASE_ANON_KEY);

const p = await sb.from('intake_submissions').select('id, destination').eq('status', 'pending');
const u = await sb.from('manual_uploads').select('id, caption').eq('parsed', false);
console.log(JSON.stringify({
  pendingIntake: p.data,
  pendingIntakeErr: p.error?.message,
  unparsedUploads: u.data,
  unparsedUploadsErr: u.error?.message,
}));
