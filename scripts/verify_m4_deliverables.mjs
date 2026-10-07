import fs from "fs";
import path from "path";
import ts from "typescript";

console.log("================================================================");
console.log("MILRESTONE 4 GATE - EMPIRICAL VERIFICATION & STRESS TEST HARNESS");
console.log("================================================================\n");

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}: ${details}`);
    failures.push({ testName, details });
  }
}

// ============================================================================
// PART 1: EXTRACT SCHEMA ORACLE FROM src/integrations/supabase/types.ts
// ============================================================================
console.log(">>> [1/5] Extracting Schema Definitions from TypeScript AST...");

const typesTsPath = path.resolve("src/integrations/supabase/types.ts");
assert(fs.existsSync(typesTsPath), "types.ts exists at src/integrations/supabase/types.ts");

const typesContent = fs.readFileSync(typesTsPath, "utf8");
const sourceFile = ts.createSourceFile("types.ts", typesContent, ts.ScriptTarget.Latest, true);

const tsTables = {};
const tsEnums = {};
const tsFunctions = {};
const tsViews = {};

// Helper to find nodes in AST
function traverse(node) {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === "Database") {
    // Database -> public -> Tables, Views, Functions, Enums
    const dbType = node.type;
    if (ts.isTypeLiteralNode(dbType)) {
      for (const member of dbType.members) {
        if (ts.isPropertySignature(member) && member.name.getText(sourceFile) === "public") {
          const publicType = member.type;
          if (ts.isTypeLiteralNode(publicType)) {
            for (const pubMember of publicType.members) {
              const name = pubMember.name.getText(sourceFile);
              if (name === "Tables" && ts.isTypeLiteralNode(pubMember.type)) {
                for (const tableMember of pubMember.type.members) {
                  const tableName = tableMember.name.getText(sourceFile).replace(/['"]/g, "");
                  tsTables[tableName] = [];
                  if (ts.isTypeLiteralNode(tableMember.type)) {
                    for (const tableSub of tableMember.type.members) {
                      if (
                        tableSub.name.getText(sourceFile) === "Row" &&
                        ts.isTypeLiteralNode(tableSub.type)
                      ) {
                        for (const colMember of tableSub.type.members) {
                          const colName = colMember.name.getText(sourceFile).replace(/['"]/g, "");
                          const colType = colMember.type.getText(sourceFile);
                          tsTables[tableName].push({ name: colName, type: colType });
                        }
                      }
                    }
                  }
                }
              } else if (name === "Enums" && ts.isTypeLiteralNode(pubMember.type)) {
                for (const enumMember of pubMember.type.members) {
                  const enumName = enumMember.name.getText(sourceFile).replace(/['"]/g, "");
                  const values = [];
                  if (ts.isUnionTypeNode(enumMember.type)) {
                    for (const unionElem of enumMember.type.types) {
                      if (ts.isLiteralTypeNode(unionElem)) {
                        values.push(unionElem.literal.getText(sourceFile).replace(/['"]/g, ""));
                      }
                    }
                  } else if (ts.isLiteralTypeNode(enumMember.type)) {
                    values.push(enumMember.type.literal.getText(sourceFile).replace(/['"]/g, ""));
                  }
                  tsEnums[enumName] = values;
                }
              } else if (name === "Functions" && ts.isTypeLiteralNode(pubMember.type)) {
                for (const funcMember of pubMember.type.members) {
                  const funcName = funcMember.name.getText(sourceFile).replace(/['"]/g, "");
                  tsFunctions[funcName] = true;
                }
              } else if (name === "Views" && ts.isTypeLiteralNode(pubMember.type)) {
                for (const viewMember of pubMember.type.members) {
                  const viewName = viewMember.name.getText(sourceFile).replace(/['"]/g, "");
                  tsViews[viewName] = [];
                  if (ts.isTypeLiteralNode(viewMember.type)) {
                    for (const viewSub of viewMember.type.members) {
                      if (
                        viewSub.name.getText(sourceFile) === "Row" &&
                        ts.isTypeLiteralNode(viewSub.type)
                      ) {
                        for (const colMember of viewSub.type.members) {
                          tsViews[viewName].push(
                            colMember.name.getText(sourceFile).replace(/['"]/g, ""),
                          );
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

const tableNames = Object.keys(tsTables).sort();
console.log(`Discovered ${tableNames.length} tables in types.ts:`);
console.log(tableNames.join(", "));
assert(tableNames.length === 17, "Exact 17 tables in types.ts", `Found ${tableNames.length}`);

console.log("\nDiscovered Enums in types.ts:");
for (const [e, vals] of Object.entries(tsEnums)) {
  console.log(`  ${e}: [${vals.join(", ")}]`);
}
assert(
  Object.keys(tsEnums).length === 3,
  "Exact 3 enums in types.ts",
  `Found ${Object.keys(tsEnums).length}`,
);

console.log("\nDiscovered Functions in types.ts:");
console.log(Object.keys(tsFunctions).join(", "));
assert(
  Object.keys(tsFunctions).length === 3,
  "Exact 3 functions in types.ts",
  `Found ${Object.keys(tsFunctions).length}`,
);

console.log("\nDiscovered Views in types.ts:");
console.log(Object.keys(tsViews).join(", "));
assert(
  Object.keys(tsViews).length === 1,
  "Exact 1 view in types.ts",
  `Found ${Object.keys(tsViews).length}`,
);

// ============================================================================
// PART 2: PARSE AND VALIDATE SQL MIGRATION FILE
// ============================================================================
console.log(
  "\n>>> [2/5] Parsing and Validating supabase/migrations/20241001000000_initial_schema.sql...",
);

const sqlMigrationPath = path.resolve("supabase/migrations/20241001000000_initial_schema.sql");
assert(fs.existsSync(sqlMigrationPath), "Migration SQL file exists");

const sqlContent = fs.readFileSync(sqlMigrationPath, "utf8");

// 2.1 Table Existence and Column Parity
const tableBlocks = {};
const createTableRegex =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/gi;
let match;
while ((match = createTableRegex.exec(sqlContent)) !== null) {
  const tName = match[1];
  const tBody = match[2];
  tableBlocks[tName] = tBody;
}

console.log(`Parsed ${Object.keys(tableBlocks).length} CREATE TABLE definitions from SQL.`);
assert(Object.keys(tableBlocks).length >= 17, "At least 17 tables defined in SQL migration");

for (const tName of tableNames) {
  const existsInSql = Boolean(tableBlocks[tName]);
  assert(existsInSql, `Table "${tName}" exists in SQL migration`, `Missing table ${tName}`);

  if (existsInSql) {
    const body = tableBlocks[tName];
    // Check if table creation has IF NOT EXISTS
    const fullMatch = sqlContent.match(
      new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${tName}\\b`, "i"),
    );
    assert(Boolean(fullMatch), `Table "${tName}" has IF NOT EXISTS clause`);

    // Verify all columns from types.ts exist in this table
    const expectedCols = tsTables[tName];
    for (const col of expectedCols) {
      // Look for column name as start of line or identifier in table body
      // Column lines typically look like: "  col_name   type ..."
      const colRegex = new RegExp(`^\\s*${col.name}\\b`, "m");
      const colFound = colRegex.test(body);
      assert(colFound, `Table "${tName}" contains column "${col.name}" (${col.type})`);
    }
  }
}

// 2.2 Enums Verification in SQL
console.log("\n--- Checking Enums in SQL ---");
for (const [enumName, enumValues] of Object.entries(tsEnums)) {
  const enumRegex = new RegExp(`CREATE\\s+TYPE\\s+public\\.${enumName}\\s+AS\\s+ENUM`, "i");
  assert(enumRegex.test(sqlContent), `Enum "${enumName}" created in SQL`);

  // Check idempotent handling (DO $$ BEGIN ... CREATE TYPE ... EXCEPTION WHEN duplicate_object)
  const doBlockRegex = new RegExp(
    `DO\\s*\\$\\$\\s*BEGIN[\\s\\S]*?CREATE\\s+TYPE\\s+public\\.${enumName}[\\s\\S]*?EXCEPTION\\s+WHEN\\s+duplicate_object`,
    "i",
  );
  assert(
    doBlockRegex.test(sqlContent),
    `Enum "${enumName}" has idempotent DO block exception handler`,
  );

  // Check all enum values
  for (const val of enumValues) {
    const valRegex = new RegExp(`'${val}'`);
    assert(valRegex.test(sqlContent), `Enum "${enumName}" includes value "${val}"`);

    // Check ALTER TYPE ADD VALUE IF NOT EXISTS
    const alterRegex = new RegExp(
      `ALTER\\s+TYPE\\s+public\\.${enumName}\\s+ADD\\s+VALUE\\s+IF\\s+NOT\\s+EXISTS\\s+'${val}'`,
      "i",
    );
    assert(
      alterRegex.test(sqlContent),
      `Enum "${enumName}" has idempotent ALTER TYPE ADD VALUE IF NOT EXISTS for '${val}'`,
    );
  }
}

// 2.3 Functions Verification in SQL
console.log("\n--- Checking Functions in SQL ---");
for (const funcName of Object.keys(tsFunctions)) {
  const funcRegex = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${funcName}\\b`,
    "i",
  );
  assert(
    funcRegex.test(sqlContent),
    `Function "${funcName}" has CREATE OR REPLACE FUNCTION in SQL`,
  );
}

// 2.4 View Verification in SQL
console.log("\n--- Checking Views in SQL ---");
for (const viewName of Object.keys(tsViews)) {
  const viewRegex = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+VIEW\\s+public\\.${viewName}\\b`, "i");
  assert(viewRegex.test(sqlContent), `View "${viewName}" has CREATE OR REPLACE VIEW in SQL`);
}

// 2.5 Triggers Verification in SQL
console.log("\n--- Checking Triggers in SQL ---");
const expectedTriggers = [
  { name: "on_auth_user_created", table: "auth.users" },
  { name: "articles_updated_at", table: "public.articles" },
  { name: "jka_posts_updated_at", table: "public.jan_ki_awaaz_posts" },
  { name: "profiles_updated_at", table: "public.profiles" },
  { name: "jka_status_history_trigger", table: "public.jan_ki_awaaz_posts" },
];

for (const trig of expectedTriggers) {
  const dropRegex = new RegExp(
    `DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${trig.name}\\s+ON\\s+${trig.table}`,
    "i",
  );
  assert(
    dropRegex.test(sqlContent),
    `Trigger "${trig.name}" has idempotent DROP TRIGGER IF EXISTS`,
  );

  const createRegex = new RegExp(
    `CREATE\\s+TRIGGER\\s+${trig.name}\\s+[\\s\\S]*?ON\\s+${trig.table}`,
    "i",
  );
  assert(createRegex.test(sqlContent), `Trigger "${trig.name}" is defined on ${trig.table}`);
}

// 2.6 RLS Enabled on All 17 Tables
console.log("\n--- Checking RLS Policies and Idempotency in SQL ---");
for (const tName of tableNames) {
  const rlsEnableRegex = new RegExp(
    `ALTER\\s+TABLE\\s+public\\.${tName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  assert(rlsEnableRegex.test(sqlContent), `RLS enabled on table "${tName}"`);
}

// Check that CREATE POLICY statements have corresponding DROP POLICY IF EXISTS
const createPolicyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_.]+)/gi;
let policyMatch;
let policyCount = 0;
while ((policyMatch = createPolicyRegex.exec(sqlContent)) !== null) {
  policyCount++;
  const policyName = policyMatch[1];
  const targetTable = policyMatch[2];
  const dropRegex = new RegExp(
    `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policyName}"\\s+ON\\s+${targetTable}`,
    "i",
  );
  assert(
    dropRegex.test(sqlContent),
    `Policy "${policyName}" on ${targetTable} preceded by DROP POLICY IF EXISTS`,
  );
}
console.log(`Verified ${policyCount} RLS policies for idempotency.`);

// 2.7 Storage Bucket and Seed Data Idempotency
console.log("\n--- Checking Storage Bucket & Seed Data Idempotency ---");
const storageBucketRegex =
  /INSERT\s+INTO\s+storage\.buckets[\s\S]*?ON\s+CONFLICT\s*\(id\)\s*DO\s+UPDATE/i;
assert(
  storageBucketRegex.test(sqlContent),
  'Storage bucket "media" created idempotently with ON CONFLICT (id) DO UPDATE',
);

const seedTownsRegex =
  /INSERT\s+INTO\s+public\.towns[\s\S]*?ON\s+CONFLICT\s*\(slug\)\s*DO\s+UPDATE/i;
assert(
  seedTownsRegex.test(sqlContent),
  "Baseline seed towns created idempotently with ON CONFLICT (slug) DO UPDATE",
);

const seedCatsRegex =
  /INSERT\s+INTO\s+public\.categories[\s\S]*?ON\s+CONFLICT\s*\(slug\)\s*DO\s+UPDATE/i;
assert(
  seedCatsRegex.test(sqlContent),
  "Baseline seed categories created idempotently with ON CONFLICT (slug) DO UPDATE",
);

// ============================================================================
// PART 3: VERIFY HTML BUNDLES
// ============================================================================
console.log("\n>>> [3/5] Verifying Web & Native HTML Bundles...");

function validateHtml(filePath, label) {
  assert(fs.existsSync(filePath), `${label} exists at ${filePath}`);
  if (!fs.existsSync(filePath)) return;

  const html = fs.readFileSync(filePath, "utf8");
  assert(html.length > 200, `${label} is non-empty (${html.length} bytes)`);
  assert(/<!DOCTYPE\s+html>/i.test(html), `${label} contains valid <!DOCTYPE html>`);
  assert(
    /<html[^>]*>/i.test(html) && /<\/html>/i.test(html),
    `${label} contains <html> and </html>`,
  );
  assert(/<head[^>]*>[\s\S]*<\/head>/i.test(html), `${label} contains <head> tag`);
  assert(/<meta\s+name=["']viewport["']/i.test(html), `${label} contains viewport meta tag`);
  assert(/<title>[\s\S]*<\/title>/i.test(html), `${label} contains <title> tag`);
  assert(
    /<div\s+id=["']root["']\s*><\/div>/i.test(html),
    `${label} contains mount container <div id="root"></div>`,
  );
  assert(
    /<script\s+type=["']module["']\s+crossorigin\s+src=["']\/assets\/index-[^"']+\.js["']/i.test(
      html,
    ),
    `${label} references bundled JS module`,
  );
  assert(
    /<link\s+rel=["']stylesheet["']\s+crossorigin\s+href=["']\/assets\/styles-[^"']+\.css["']/i.test(
      html,
    ),
    `${label} references bundled CSS stylesheet`,
  );
}

validateHtml(path.resolve("dist/client/index.html"), "dist/client/index.html");
validateHtml(
  path.resolve("android/app/src/main/assets/public/index.html"),
  "android/app/src/main/assets/public/index.html",
);

// ============================================================================
// PART 4: VERIFY BUNDLED JS (Supabase credentials & Push Notifications)
// ============================================================================
console.log("\n>>> [4/5] Verifying Bundled JS in android/app/src/main/assets/public/assets/...");

const androidAssetsDir = path.resolve("android/app/src/main/assets/public/assets");
assert(fs.existsSync(androidAssetsDir), `Android assets directory exists: ${androidAssetsDir}`);

const jsFiles = fs.readdirSync(androidAssetsDir).filter((f) => f.endsWith(".js"));
console.log(`Found JS bundle files: ${jsFiles.join(", ")}`);
assert(jsFiles.length > 0, "At least one JS bundle file in assets");

let foundSupabaseUrl = false;
let foundPublishableKey = false;
let foundPushPlugin = false;
let foundPushRegister = false;
let foundPushListeners = false;
let matchedFiles = {};

for (const jsFile of jsFiles) {
  const filePath = path.join(androidAssetsDir, jsFile);
  const content = fs.readFileSync(filePath, "utf8");

  if (content.includes("https://xhxjroxdgdftsngfkggi.supabase.co")) {
    foundSupabaseUrl = true;
    matchedFiles["supabase_url"] = jsFile;
  }
  if (content.includes("sb_publishable_EiyprYhAi2XiwC-cbWBb3w_KJQPd37p")) {
    foundPublishableKey = true;
    matchedFiles["publishable_key"] = jsFile;
  }
  if (content.includes("PushNotifications")) {
    foundPushPlugin = true;
    matchedFiles["push_plugin"] = jsFile;
  }
  if (content.includes(".register()") || content.includes("register()")) {
    foundPushRegister = true;
  }
  if (
    content.includes("addListener(`registration`") ||
    content.includes('addListener("registration"')
  ) {
    foundPushListeners = true;
  }
}

assert(foundSupabaseUrl, `Supabase URL bundled (${matchedFiles["supabase_url"] || "none"})`);
assert(
  foundPublishableKey,
  `Supabase Publishable Key bundled (${matchedFiles["publishable_key"] || "none"})`,
);
assert(
  foundPushPlugin,
  `PushNotifications plugin reference found (${matchedFiles["push_plugin"] || "none"})`,
);
assert(foundPushRegister, "PushNotifications.register() call found in bundle");
assert(
  foundPushListeners,
  "PushNotifications event listeners found (registration, registrationError, etc.)",
);

// Verify dist/client and android assets parity
console.log("\n--- Checking Parity between dist/client/assets and android public assets ---");
const distAssetsDir = path.resolve("dist/client/assets");
if (fs.existsSync(distAssetsDir)) {
  const distJsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith(".js"));
  assert(
    distJsFiles.sort().join(",") === jsFiles.sort().join(","),
    "JS bundle filenames match identically between dist/client and android assets",
  );
}

// ============================================================================
// PART 5: ADVERSARIAL STRESS TESTING & EDGE CASES
// ============================================================================
console.log("\n>>> [5/5] Adversarial Stress Testing & Edge Cases...");

// 5.1 Check SQL Syntax Cleanliness (no syntax anomalies)
// Check for unbalanced parenthesis in CREATE TABLE statements
for (const [tName, body] of Object.entries(tableBlocks)) {
  let openParen = 0;
  let closeParen = 0;
  for (const ch of body) {
    if (ch === "(") openParen++;
    if (ch === ")") closeParen++;
  }
  assert(
    openParen === closeParen,
    `Table "${tName}" has balanced parentheses (${openParen} open, ${closeParen} close)`,
  );
}

// 5.2 Foreign Key Reference Verification
const fkRegex = /REFERENCES\s+public\.([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/gi;
let fkMatch;
let fkCount = 0;
while ((fkMatch = fkRegex.exec(sqlContent)) !== null) {
  fkCount++;
  const refTable = fkMatch[1];
  const refCol = fkMatch[2];
  assert(Boolean(tableBlocks[refTable]), `Foreign key target table "${refTable}" exists in schema`);
}
console.log(`Verified ${fkCount} foreign key references.`);

// 5.3 Verify that no bare CREATE TABLE without IF NOT EXISTS exists
const bareCreateTable = sqlContent.match(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)public\./gi);
assert(!bareCreateTable, "Zero bare CREATE TABLE statements without IF NOT EXISTS");

// 5.4 Verify that no bare CREATE INDEX without IF NOT EXISTS exists
const bareCreateIndex = sqlContent.match(/CREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/gi);
assert(!bareCreateIndex, "Zero bare CREATE INDEX statements without IF NOT EXISTS");

// 5.5 Verify that no bare CREATE POLICY without DROP POLICY exists
const barePolicies = [];
const allPolicies = [
  ...sqlContent.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_.]+)/gi),
];
for (const p of allPolicies) {
  const pName = p[1];
  const pTable = p[2];
  if (!sqlContent.includes(`DROP POLICY IF EXISTS "${pName}" ON ${pTable}`)) {
    barePolicies.push(`${pName} on ${pTable}`);
  }
}
assert(
  barePolicies.length === 0,
  "Zero CREATE POLICY without corresponding DROP POLICY IF EXISTS",
  barePolicies.join(", "),
);

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log("\n================================================================");
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log("================================================================");

if (failures.length > 0) {
  console.log("\nFAILURES DETAIL:");
  for (const f of failures) {
    console.log(`- [${f.testName}]: ${f.details}`);
  }
}
