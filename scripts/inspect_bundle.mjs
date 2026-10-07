import fs from "fs";

const code = fs.readFileSync("android/app/src/main/assets/public/assets/index-CuK73DHZ.js", "utf8");

let idx = 0;
let matchNum = 0;
while ((idx = code.indexOf("xhxjroxdgdftsngfkggi", idx)) !== -1) {
  matchNum++;
  const start = Math.max(0, idx - 150);
  const end = Math.min(code.length, idx + 150);
  console.log(`\n=== Match ${matchNum} for xhxjroxdgdftsngfkggi at offset ${idx} ===`);
  console.log(code.substring(start, end));
  idx += "xhxjroxdgdftsngfkggi".length;
}

idx = 0;
matchNum = 0;
while ((idx = code.indexOf("sb_publishable", idx)) !== -1) {
  matchNum++;
  const start = Math.max(0, idx - 150);
  const end = Math.min(code.length, idx + 150);
  console.log(`\n=== Match ${matchNum} for sb_publishable at offset ${idx} ===`);
  console.log(code.substring(start, end));
  idx += "sb_publishable".length;
}
