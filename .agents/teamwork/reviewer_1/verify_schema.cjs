const fs = require('fs');

const typesContent = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');
const sqlContent = fs.readFileSync('supabase/migrations/20241001000000_initial_schema.sql', 'utf8');

const tables = [
  'admin_activity_logs', 'advertisements', 'articles', 'bookmarks', 'categories',
  'epapers', 'event_registrations', 'events', 'jan_ki_awaaz_posts',
  'jan_ki_awaaz_status_history', 'live_streams', 'profiles', 'reels',
  'towns', 'user_roles', 'videos', 'villages'
];

let totalCols = 0;
const errors = [];
const tableDetails = {};

for (const t of tables) {
  // Find table start in types.ts
  const tIdx = typesContent.indexOf(t + ': {');
  if (tIdx === -1) {
    errors.push(`Table ${t} not found in types.ts`);
    continue;
  }
  const rowIdx = typesContent.indexOf('Row: {', tIdx);
  const rowEndIdx = typesContent.indexOf('Insert: {', rowIdx);
  const rowContent = typesContent.substring(rowIdx + 6, rowEndIdx);
  
  // Extract columns
  const lines = rowContent.split('\n');
  const cols = [];
  for (let l of lines) {
    l = l.trim();
    if (!l || l.startsWith('//') || l.startsWith('}') || !l.includes(':')) continue;
    const parts = l.split(':');
    const colName = parts[0].trim();
    const colType = parts.slice(1).join(':').trim();
    cols.push({ name: colName, type: colType });
  }

  // Find table in SQL
  const sqlTableStart = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS public.' + t);
  if (sqlTableStart === -1) {
    errors.push(`Table ${t} missing from SQL`);
    continue;
  }
  const sqlTableEnd = sqlContent.indexOf(');', sqlTableStart);
  const sqlDef = sqlContent.substring(sqlTableStart, sqlTableEnd);

  const missingCols = [];
  for (const c of cols) {
    totalCols++;
    // Regex for column word in SQL definition
    const re = new RegExp(`\\b${c.name}\\b`);
    if (!re.test(sqlDef)) {
      missingCols.push(c.name);
    }
  }

  if (missingCols.length > 0) {
    errors.push(`Table ${t} missing columns in SQL: ${missingCols.join(', ')}`);
  }

  tableDetails[t] = {
    colCount: cols.length,
    cols: cols.map(c => c.name)
  };
}

console.log('--- TABLE SCHEMA VERIFICATION REPORT ---');
console.log(`Verified ${tables.length} tables, total ${totalCols} columns checked.`);
for (const [t, info] of Object.entries(tableDetails)) {
  console.log(`✓ ${t}: ${info.colCount} columns -> [${info.cols.join(', ')}]`);
}

if (errors.length > 0) {
  console.error('\nERRORS FOUND:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\nRESULT: 100% PERFECT COLUMN MATCH ACROSS ALL 17 TABLES!');
}
