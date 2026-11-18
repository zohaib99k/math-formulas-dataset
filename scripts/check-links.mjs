// Checks that every Mathovia URL in the dataset responds with HTTP 200.
// Needs network access. Usage: node scripts/check-links.mjs
import { loadFormulas } from "./lib.mjs";

const urls = [...new Set(loadFormulas().flatMap((f) => Object.values(f.links)))].sort();
const failures = [];
const CONCURRENCY = 6;

async function check(url) {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "manual" });
    if (res.status === 405) res = await fetch(url, { redirect: "manual" });
    if (res.status !== 200) failures.push(`${res.status} ${url}`);
  } catch (e) {
    failures.push(`ERR ${url} (${e.message})`);
  }
}

for (let i = 0; i < urls.length; i += CONCURRENCY) {
  await Promise.all(urls.slice(i, i + CONCURRENCY).map(check));
}

if (failures.length) {
  console.error(`✗ ${failures.length} of ${urls.length} links failed (redirects count as failures — use the final URL):`);
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(`✓ All ${urls.length} Mathovia links return 200.`);
