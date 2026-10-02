const fs = require('fs');

const typesContent = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8').replace(/\r\n/g, '\n');
const sqlContent = fs.readFileSync('supabase/migrations/20241001000000_initial_schema.sql', 'utf8').replace(/\r\n/g, '\n');

const tables = [
  'admin_activity_logs', 'advertisements', 'articles', 'bookmarks', 'categories',
  'epapers', 'event_registrations', 'events', 'jan_ki_awaaz_posts',
  'jan_ki_awaaz_status_history', 'live_streams', 'profiles', 'reels',
  'towns', 'user_roles', 'videos', 'villages'
];

let totalRels = 0;
const relResults = [];

for (let i = 0; i < tables.length; i++) {
  const t = tables[i];
  const tStart = typesContent.indexOf(`      ${t}: {`);
  if (tStart === -1) continue;
  
  const nextStart = (i < tables.length - 1) 
    ? typesContent.indexOf(`      ${tables[i+1]}: {`, tStart)
    : typesContent.indexOf('    Views:', tStart);
  
  const tableBlock = typesContent.substring(tStart, nextStart);
  
  if (tableBlock.includes('Relationships: []')) {
    continue;
  }
  
  const relStart = tableBlock.indexOf('Relationships: [');
  if (relStart === -1) continue;
  const relEnd = tableBlock.indexOf('\n        ]', relStart);
  const relBlock = tableBlock.substring(relStart, relEnd + 10);

  // Extract each relationship object
  const fkeys = [...relBlock.matchAll(/foreignKeyName:\s*"([^"]+)"[\s\S]*?columns:\s*\["([^"]+)"\][\s\S]*?referencedRelation:\s*"([^"]+)"[\s\S]*?referencedColumns:\s*\["([^"]+)"\]/g)];
  
  // Find table definition in SQL
  const sqlTableStart = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS public.' + t);
  const sqlTableEnd = sqlContent.indexOf(');', sqlTableStart);
  const sqlDef = sqlContent.substring(sqlTableStart, sqlTableEnd);

  for (const m of fkeys) {
    totalRels++;
    const fkName = m[1];
    const col = m[2];
    const refTable = m[3];
    const refCol = m[4];

    // Check if SQL has references
    const refRegex = new RegExp(`${col}[^,;]*REFERENCES\\s+public\\.${refTable}\\s*\\(${refCol}\\)`, 'i');
    const hasRef = refRegex.test(sqlDef);
    relResults.push({
      table: t,
      column: col,
      fkName: fkName,
      target: `${refTable}(${refCol})`,
      found: hasRef
    });
  }
}

console.log('--- RELATIONSHIP (FOREIGN KEY) REPORT ---');
console.log(`Found ${totalRels} foreign key relationships defined in types.ts:`);
let allMatch = true;
for (const r of relResults) {
  console.log(`- [${r.table}] ${r.column} -> ${r.target} (${r.fkName}): ${r.found ? 'VERIFIED' : 'NOT FOUND'}`);
  if (!r.found) allMatch = false;
}

if (!allMatch) {
  console.error('\nERROR: Foreign key mismatch detected!');
  process.exit(1);
} else {
  console.log('\nRESULT: ALL FOREIGN KEYS DEFINED IN types.ts ARE PRESENT IN SQL MIGRATION!');
}
