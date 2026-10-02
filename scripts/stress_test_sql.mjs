import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/migrations/20241001000000_initial_schema.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

console.log('--- SQL STRESS TEST & LEXICAL AUDIT ---');

// 1. Check dollar quotes $$
const dollarCount = (content.match(/\$\$/g) || []).length;
console.log(`$$ occurrences: ${dollarCount}`);
if (dollarCount % 2 !== 0) {
  console.error('[FAIL] Odd number of $$ dollar quotes!');
  process.exit(1);
} else {
  console.log('[PASS] $$ dollar quotes are properly paired.');
}

// 2. Count statements separated by semicolon (excluding inside $$)
let inDollar = false;
let inSingleQuote = false;
let statementCount = 0;
let currentStmt = '';
const statements = [];

for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const next = content[i + 1] || '';

  if (!inSingleQuote && ch === '$' && next === '$') {
    inDollar = !inDollar;
    i++; // skip next $
    currentStmt += '$$';
    continue;
  }

  if (!inDollar && ch === "'") {
    // Check for escaped quote ''
    if (inSingleQuote && next === "'") {
      currentStmt += "''";
      i++;
      continue;
    }
    inSingleQuote = !inSingleQuote;
    currentStmt += ch;
    continue;
  }

  if (!inDollar && !inSingleQuote && ch === ';') {
    const trimmed = currentStmt.trim();
    if (trimmed && !trimmed.startsWith('--')) {
      statements.push(trimmed);
      statementCount++;
    }
    currentStmt = '';
    continue;
  }

  currentStmt += ch;
}

if (inDollar) {
  console.error('[FAIL] Unclosed $$ at EOF!');
  process.exit(1);
}
if (inSingleQuote) {
  console.error('[FAIL] Unclosed single quote at EOF!');
  process.exit(1);
}

console.log(`[PASS] Lexer parsed ${statements.length} distinct SQL statements cleanly.`);

// 3. Inspect statement types
const stmtTypes = {};
for (const s of statements) {
  // Strip comments from start
  const clean = s.replace(/^(\s*--[^\n]*\n)+/g, '').trim();
  const firstWord = clean.split(/\s+/)[0].toUpperCase();
  const secondWord = (clean.split(/\s+/)[1] || '').toUpperCase();
  const key = `${firstWord} ${secondWord}`;
  stmtTypes[key] = (stmtTypes[key] || 0) + 1;
}

console.log('Statement distribution:');
for (const [k, v] of Object.entries(stmtTypes)) {
  console.log(`  ${k}: ${v}`);
}

// 4. Check for any non-idempotent statements
let nonIdempotentCount = 0;
for (const s of statements) {
  const clean = s.replace(/^(\s*--[^\n]*\n)+/g, '').trim();
  const upper = clean.toUpperCase();

  // CREATE TABLE without IF NOT EXISTS
  if (upper.startsWith('CREATE TABLE') && !upper.startsWith('CREATE TABLE IF NOT EXISTS')) {
    console.error('[NON-IDEMPOTENT] Bare CREATE TABLE:', clean.substring(0, 50));
    nonIdempotentCount++;
  }
  // CREATE INDEX without IF NOT EXISTS
  if (upper.startsWith('CREATE INDEX') && !upper.startsWith('CREATE INDEX IF NOT EXISTS') && !upper.startsWith('CREATE UNIQUE INDEX IF NOT EXISTS')) {
    console.error('[NON-IDEMPOTENT] Bare CREATE INDEX:', clean.substring(0, 50));
    nonIdempotentCount++;
  }
  // Bare INSERT without ON CONFLICT
  if (upper.startsWith('INSERT INTO') && !upper.includes('ON CONFLICT')) {
    console.error('[NON-IDEMPOTENT] Bare INSERT INTO:', clean.substring(0, 50));
    nonIdempotentCount++;
  }
}

if (nonIdempotentCount === 0) {
  console.log('[PASS] ZERO non-idempotent statements found in migration!');
} else {
  console.error(`[FAIL] Found ${nonIdempotentCount} non-idempotent statements.`);
  process.exit(1);
}
