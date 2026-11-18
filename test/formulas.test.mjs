import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFormulas, validateAll, validateFormula, evaluate, checkExpression, approxEqual } from "../scripts/lib.mjs";

const formulas = loadFormulas();

test("dataset passes validation", () => {
  assert.deepEqual(validateAll(formulas), []);
});

test("ids are unique", () => {
  const ids = formulas.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every worked example matches its compute expression", () => {
  for (const f of formulas) {
    for (const ex of f.examples) {
      const actual = evaluate(f, ex.inputs);
      assert.ok(approxEqual(actual, ex.output, ex.tolerance), `${f.id}: expected ${ex.output}, got ${actual}`);
    }
  }
});

test("LaTeX parses with KaTeX", async (t) => {
  let katex;
  try {
    katex = (await import("katex")).default;
  } catch {
    t.skip("katex not installed (run npm install)");
    return;
  }
  for (const f of formulas) {
    assert.doesNotThrow(() => katex.renderToString(f.latex, { throwOnError: true }), `${f.id}: latex failed to parse`);
    for (const v of f.variables) {
      assert.doesNotThrow(() => katex.renderToString(v.symbol, { throwOnError: true }), `${f.id}: symbol ${v.symbol}`);
    }
  }
});

// --- the validator itself must catch mistakes -------------------------------
const base = () => structuredClone(formulas.find((f) => f.id === "slope-formula"));

test("validator rejects a wrong example output", () => {
  const f = base();
  f.examples[0].output = 4;
  assert.ok(validateFormula(f).some((m) => m.includes("expected 4")));
});

test("validator rejects non-Mathovia links", () => {
  const f = base();
  f.links.learn = "https://example.com/slope/";
  assert.ok(validateFormula(f).some((m) => m.includes("links.learn")));
});

test("validator rejects unknown identifiers and unsafe code in compute", () => {
  assert.ok(checkExpression("process.exit(1)", ["x"]).length > 0);
  assert.ok(checkExpression("x => x", ["x"]).length > 0);
  assert.ok(checkExpression("constructor", ["x"]).length > 0);
  assert.deepEqual(checkExpression("sqrt(x**2 + 1)", ["x"]), []);
});

test("validator rejects missing example inputs", () => {
  const f = base();
  delete f.examples[0].inputs.y2;
  assert.ok(validateFormula(f).some((m) => m.includes('missing numeric input "y2"')));
});
