// Validates every formula in data/*.json and runs each worked example.
// Usage: node scripts/validate.mjs
import { loadFormulas, validateAll } from "./lib.mjs";

const formulas = loadFormulas();
const problems = validateAll(formulas);

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
const examples = formulas.reduce((n, f) => n + f.examples.length, 0);
console.log(`✓ ${formulas.length} formulas valid, ${examples} worked examples verified.`);
