// One-shot codemod: deletedAt: null -> deletedAt: { isSet: false }
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");
const exts = new Set([".ts", ".tsx"]);

let totalReplacements = 0;
let filesTouched = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (exts.has(path.extname(full))) process(full);
  }
}

function process(file) {
  const src = fs.readFileSync(file, "utf8");
  // Match: deletedAt: null   (with any whitespace)
  const re = /deletedAt:\s*null\b/g;
  const matches = src.match(re);
  if (!matches) return;
  const out = src.replace(re, "deletedAt: { isSet: false }");
  fs.writeFileSync(file, out);
  totalReplacements += matches.length;
  filesTouched++;
  console.log(`  ${path.relative(ROOT, file)}  (${matches.length})`);
}

walk(ROOT);
console.log(`\nDone: ${totalReplacements} replacements in ${filesTouched} files`);
