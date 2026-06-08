import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const indexPath = path.join(distDir, "index.html");
const offlinePath = path.join(distDir, "escape-offline.html");
const rootOfflinePath = path.join(root, "逃逸.html");

function escapeClosingScript(source) {
  return source.replaceAll("</script", "<\\/script");
}

function guessMime(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

async function toDataUrl(assetPath) {
  const bytes = await readFile(assetPath);
  return `data:${guessMime(assetPath)};base64,${bytes.toString("base64")}`;
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function inlineAssetReferences(source, baseDir = distDir) {
  const matches = new Set(source.match(/(?:\.\/)?assets\/[^"'`)\\\s]+/g) ?? []);
  let output = source;

  for (const match of matches) {
    const normalized = match.replace(/^\.\//, "");
    const assetPath = path.join(distDir, normalized);
    const dataUrl = await toDataUrl(assetPath);
    output = output.replaceAll(match, dataUrl);
  }

  const newUrlMatches = [...output.matchAll(/new URL\("([^"]+\.(?:png|jpe?g|webp|svg))",import\.meta\.url\)\.href/g)];
  for (const match of newUrlMatches) {
    const assetPath = path.join(baseDir, match[1]);
    const dataUrl = await toDataUrl(assetPath);
    output = output.replaceAll(match[0], JSON.stringify(dataUrl));
  }

  return output;
}

const html = await readFile(indexPath, "utf8");
const scriptMatch = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);

if (!scriptMatch || !styleMatch) {
  throw new Error("Could not find Vite script/style tags in dist/index.html.");
}

const scriptPath = path.join(distDir, scriptMatch[1].replace(/^\.\//, ""));
const stylePath = path.join(distDir, styleMatch[1].replace(/^\.\//, ""));

const js = await inlineAssetReferences(await readFile(scriptPath, "utf8"), path.dirname(scriptPath));
const css = await inlineAssetReferences(await readFile(stylePath, "utf8"), path.dirname(stylePath));

const offlineHtml = html
  .replace(styleMatch[0], () => `<style>\n${css}\n</style>`)
  .replace(scriptMatch[0], () => `<script type="module">\n${escapeClosingScript(js)}\n</script>`);

await writeFile(offlinePath, offlineHtml, "utf8");
await writeFile(rootOfflinePath, offlineHtml, "utf8");

const distHash = sha256(await readFile(offlinePath));
const rootHash = sha256(await readFile(rootOfflinePath));
if (distHash !== rootHash) {
  throw new Error("Offline HTML hash mismatch between dist and root outputs.");
}

console.log(`Wrote ${path.relative(root, offlinePath)} and ${path.relative(root, rootOfflinePath)}`);
