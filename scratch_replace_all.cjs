const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Replace Abhi Tak variations
  content = content.replace(/Abhi Tak/g, 'Abhitak');
  content = content.replace(/ABHI TAK/g, 'ABHITAK');
  content = content.replace(/abhi tak/g, 'abhitak');

  // 2. Remove Bijnor from taglines, headlines, headers, titles, meta tags
  content = content.replace(/District Bijnor News/g, 'News');
  content = content.replace(/District Bijnor's news network/g, 'Digital news network');
  content = content.replace(/District Bijnor's/g, "the region's");
  content = content.replace(/District Bijnor, Uttar Pradesh/g, 'Uttar Pradesh');
  content = content.replace(/District Bijnor, U\.P\./g, 'U.P.');
  content = content.replace(/District Bijnor/g, 'the Region');
  content = content.replace(/district Bijnor/g, 'the region');
  content = content.replace(/District Bijnor/gi, 'News');
  content = content.replace(/जनपद बिजनौर/g, 'उत्तर प्रदेश');
  content = content.replace(/बिजनौर ज़िले/g, 'क्षेत्र');
  content = content.replace(/बिजनौर जिले/g, 'क्षेत्र');
  content = content.replace(/बिजनौर की बात/g, 'आज की बात');
  content = content.replace(/बिजनौर प्रभात/g, 'प्रभात समाचार');
  content = content.replace(/बिजनौर स्टूडियो/g, 'न्यूज़रूम स्टूडियो');
  content = content.replace(/बिजनौर/g, ''); // Remove remaining standalone Bijnor in headlines/taglines

  // Clean up any double spaces or awkward punctuation introduced
  content = content.replace(/—\s+News/g, '— Latest News');
  content = content.replace(/·\s+·/g, '·');
  content = content.replace(/\s{2,}/g, ' ');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        walkDir(full);
      }
    } else if (/\.(tsx|ts|jsx|js|html|json|webmanifest)$/.test(f) && !f.includes('types.ts')) {
      processFile(full);
    }
  }
}

// Process src and public and root html files
walkDir('src');
walkDir('public');
if (fs.existsSync('index.html')) processFile('index.html');
if (fs.existsSync('index.capacitor.html')) processFile('index.capacitor.html');

console.log('Finished bulk replacement.');
