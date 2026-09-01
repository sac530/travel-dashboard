import fs from 'fs';
import path from 'path';
const dir = 'C:/Users/sac73/.openclaw/workspace/travel-dashboard';
const out = [];
try {
  const raw = fs.readFileSync(path.join(dir, 'data/master-calendar.json'), 'utf8');
  const parsed = JSON.parse(raw);
  out.push('json ok, entries: ' + parsed.length);
  out.push('last entry id: ' + (parsed[parsed.length - 1]?.id ?? 'none'));
  out.push('dedupe entry present: ' + (!!parsed.find(e => e.id === 'intake-check-2026-08-22-dedupe')));
  const md = fs.readFileSync(path.join(dir, 'MASTER_CALENDAR.md'), 'utf8');
  out.push('md has dedupe row: ' + md.includes('duplicate Miami'));
} catch (e) {
  out.push('verify failed: ' + e.message);
}
fs.writeFileSync(path.join(dir, 'tmp-verify-result.txt'), out.join('\n'));
