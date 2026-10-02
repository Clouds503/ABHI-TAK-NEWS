import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const typesTsPath = path.resolve('src/integrations/supabase/types.ts');
const typesContent = fs.readFileSync(typesTsPath, 'utf8');
const sourceFile = ts.createSourceFile('types.ts', typesContent, ts.ScriptTarget.Latest, true);

const tsTables = {};
function traverse(node) {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Database') {
    const dbType = node.type;
    if (ts.isTypeLiteralNode(dbType)) {
      for (const member of dbType.members) {
        if (ts.isPropertySignature(member) && member.name.getText(sourceFile) === 'public') {
          const publicType = member.type;
          if (ts.isTypeLiteralNode(publicType)) {
            for (const pubMember of publicType.members) {
              const name = pubMember.name.getText(sourceFile);
              if (name === 'Tables' && ts.isTypeLiteralNode(pubMember.type)) {
                for (const tableMember of pubMember.type.members) {
                  const tableName = tableMember.name.getText(sourceFile).replace(/['"]/g, '');
                  tsTables[tableName] = {};
                  if (ts.isTypeLiteralNode(tableMember.type)) {
                    for (const tableSub of tableMember.type.members) {
                      if (tableSub.name.getText(sourceFile) === 'Row' && ts.isTypeLiteralNode(tableSub.type)) {
                        for (const colMember of tableSub.type.members) {
                          const colName = colMember.name.getText(sourceFile).replace(/['"]/g, '');
                          const colType = colMember.type.getText(sourceFile);
                          tsTables[tableName][colName] = colType;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  ts.forEachChild(node, traverse);
}
traverse(sourceFile);

const sqlMigrationPath = path.resolve('supabase/migrations/20241001000000_initial_schema.sql');
const sqlContent = fs.readFileSync(sqlMigrationPath, 'utf8');

// Parse SQL tables and columns
const sqlTables = {};
const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/gi;
let match;
while ((match = createTableRegex.exec(sqlContent)) !== null) {
  const tName = match[1];
  const tBody = match[2];
  sqlTables[tName] = {};

  const lines = tBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || /^(UNIQUE|PRIMARY|FOREIGN|CONSTRAINT|CHECK)\b/i.test(trimmed)) {
      continue;
    }
    const colMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+([\s\S]+?)(?:,|$)/);
    if (colMatch) {
      const colName = colMatch[1];
      const colDef = colMatch[2].trim();
      sqlTables[tName][colName] = colDef;
    }
  }
}

console.log('--- REFINED TABLE & COLUMN AUDIT ---');
let allMatch = true;

for (const tName of Object.keys(tsTables).sort()) {
  const tsCols = tsTables[tName];
  const sqlCols = sqlTables[tName] || {};
  
  const tsColNames = Object.keys(tsCols).sort();
  const sqlColNames = Object.keys(sqlCols).sort();

  console.log(`Table: ${tName} (TS cols: ${tsColNames.length}, SQL cols: ${sqlColNames.length})`);
  
  const missingInSql = tsColNames.filter(c => !sqlColNames.includes(c));
  const extraInSql = sqlColNames.filter(c => !tsColNames.includes(c));

  if (missingInSql.length > 0) {
    console.error(`  [ERROR] Missing in SQL: ${missingInSql.join(', ')}`);
    allMatch = false;
  }
  if (extraInSql.length > 0) {
    console.warn(`  [NOTE] Extra in SQL: ${extraInSql.join(', ')}`);
    allMatch = false;
  }

  for (const col of tsColNames) {
    const tsType = tsCols[col];
    const sqlDef = sqlCols[col] || 'MISSING';
    // Verify column exists
    if (!sqlCols[col]) {
      console.error(`    MISSING: ${col}`);
      allMatch = false;
    }
  }
}

console.log('\nAll TS columns accounted for in SQL (bidirectional exact match):', allMatch);
