const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "out");

console.log("Building Chrome extension from Next.js export...\n");

// 1. Rename _next to next
const oldNext = path.join(outDir, "_next");
const newNext = path.join(outDir, "next");
if (fs.existsSync(newNext)) fs.rmSync(newNext, { recursive: true });
if (fs.existsSync(oldNext)) {
  fs.renameSync(oldNext, newNext);
  console.log("[1/6] Renamed _next -> next");
} else {
  console.log("[1/6] _next already renamed");
}

// 2. Fix /_next/ paths in ALL files recursively (html, css, js)
function fixPathsRecursive(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += fixPathsRecursive(fullPath);
    } else if (/\.(html|css|js|json|txt)$/.test(entry.name)) {
      let content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("_next")) {
        content = content.replace(/\/_next\//g, "/next/");
        content = content.replace(/"_next\//g, '"next/');
        content = content.replace(/\.\/_next\//g, "./next/");
        fs.writeFileSync(fullPath, content);
        count++;
      }
    }
  }
  return count;
}
const fixedFiles = fixPathsRecursive(outDir);
console.log(`[2/6] Fixed _next paths in ${fixedFiles} files`);

// 3. Extract inline scripts from HTML files
const htmlFiles = ["index.html", "404.html"];
let totalExtracted = 0;

htmlFiles.forEach((filename) => {
  const filePath = path.join(outDir, filename);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, "utf8");

  let count = 0;
  html = html.replace(/<script>([^]*?)<\/script>/g, (match, content) => {
    if (!content.trim()) return match;
    count++;
    totalExtracted++;
    const jsFile = `${filename.replace(".html", "")}-inline-${count}.js`;
    fs.writeFileSync(path.join(outDir, jsFile), content);
    return `<script src="${jsFile}"></script>`;
  });

  // Remove data-precedence attributes that React uses but extensions don't need
  html = html.replace(/ data-precedence="[^"]*"/g, "");

  fs.writeFileSync(filePath, html);
  console.log(`[3/6] Processed ${filename}: extracted ${count} inline scripts`);
});

// 4. Create manifest.json with proper CSP
const manifest = {
  manifest_version: 3,
  name: "MugenOS",
  version: "0.1",
  description:
    "Your new tab page opens hundreds of times a day. Make it yours.",
  chrome_url_overrides: {
    newtab: "index.html",
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; object-src 'none';",
  },
};
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);
console.log("[4/6] Created manifest.json with CSP");

// 5. Copy static assets from public if missing
["favicon.svg", "noise.png"].forEach((file) => {
  const src = path.join(__dirname, "public", file);
  const dst = path.join(outDir, file);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
  }
});
console.log("[5/6] Static assets ready");

// 6. Summary
console.log(`[6/6] Done! Extracted ${totalExtracted} inline scripts.\n`);
console.log("Next steps:");
console.log("  1. Copy your .mp4 files:  copy public\\*.mp4 out\\");
console.log("  2. Open chrome://extensions");
console.log('  3. Enable "Developer mode" (top right)');
console.log('  4. Click "Load unpacked" -> select the out/ folder');
console.log("  5. Open a new tab\n");