// Shared helpers: load the dataset, validate entries, evaluate `compute` expressions.
// Zero dependencies — runs on Node.js 18+.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = join(ROOT, "data");
export const SITE = "https://mathovia.com/";

export const CATEGORIES = ["algebra", "arithmetic", "calculus", "statistics", "trigonometry"];
export const LINK_TYPES = ["learn", "calculate", "practice"];

// ---- math helpers available inside `compute` -------------------------------
function fact(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`fact(${n}) needs a non-negative integer`);
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function comb(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) {
    throw new RangeError(`comb(${n}, ${k}) needs integers 0 ≤ k ≤ n`);
  }
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export const HELPERS = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  PI: Math.PI,
  E: Math.E,
  fact,
  comb,
};

// ---- loading ---------------------------------------------------------------
export function loadFormulas() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
  const all = [];
  for (const file of files) {
    let entries;
    try {
      entries = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    } catch (e) {
      throw new Error(`data/${file}: invalid JSON — ${e.message}`);
    }
    if (!Array.isArray(entries)) throw new Error(`data/${file}: top level must be an array`);
    for (const f of entries) all.push({ ...f, _file: `data/${file}` });
  }
  return all;
}

// ---- compute expressions ---------------------------------------------------
const SAFE_CHARS = /^[0-9A-Za-z_+\-*/%().,\[\]\s]*$/;

export function checkExpression(expr, varKeys) {
  const errors = [];
  if (typeof expr !== "string" || !expr.trim()) return ["compute must be a non-empty string"];
  if (!SAFE_CHARS.test(expr)) errors.push(`compute contains characters outside the allowed set: ${expr}`);
  const idents = expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const id of idents) {
    if (!varKeys.includes(id) && !Object.hasOwn(HELPERS, id)) {
      errors.push(`compute uses unknown identifier "${id}" (not a variable key or helper)`);
    }
  }
  return errors;
}

export function evaluate(formula, inputs) {
  const keys = formula.variables.map((v) => v.key);
  const helperNames = Object.keys(HELPERS);
  // Expression is validated by checkExpression() first: only variable keys, helper names,
  // numbers and arithmetic operators can appear, so this Function cannot reach globals.
  const fn = new Function(...helperNames, ...keys, `"use strict"; return (${formula.compute});`);
  return fn(...helperNames.map((h) => HELPERS[h]), ...keys.map((k) => inputs[k]));
}

export function approxEqual(actual, expected, tolerance) {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length &&
      expected.every((e, i) => approxEqual(actual[i], e, tolerance));
  }
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  const tol = tolerance ?? 1e-9;
  return Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected));
}

// ---- validation ------------------------------------------------------------
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function bracesBalanced(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; } // skip escaped char like \{ or \\
    if (s[i] === "{") depth++;
    if (s[i] === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function validateFormula(f) {
  const e = [];
  const req = ["id", "name", "category", "topic", "latex", "plain", "description", "variables", "output", "compute", "examples", "tags", "links"];
  for (const k of req) if (f[k] === undefined) e.push(`missing field "${k}"`);
  if (e.length) return e;

  if (!ID_RE.test(f.id)) e.push(`id "${f.id}" must be kebab-case`);
  if (!CATEGORIES.includes(f.category)) e.push(`category "${f.category}" not in ${CATEGORIES.join(", ")}`);
  if (!ID_RE.test(f.topic)) e.push(`topic "${f.topic}" must be kebab-case`);
  if (!bracesBalanced(f.latex)) e.push("latex has unbalanced braces");
  if (f.description.length > 280) e.push("description longer than 280 characters");

  if (!Array.isArray(f.variables) || f.variables.length === 0) e.push("variables must be a non-empty array");
  const keys = [];
  for (const v of f.variables || []) {
    if (!KEY_RE.test(v.key ?? "")) e.push(`variable key "${v.key}" must be a valid identifier`);
    if (Object.hasOwn(HELPERS, v.key ?? "")) e.push(`variable key "${v.key}" clashes with a helper name`);
    if (keys.includes(v.key)) e.push(`duplicate variable key "${v.key}"`);
    if (!v.symbol || !v.name) e.push(`variable "${v.key}" needs symbol and name`);
    keys.push(v.key);
  }
  if (!f.output?.key || !f.output?.name) e.push("output needs key and name");

  e.push(...checkExpression(f.compute, keys));

  if (!Array.isArray(f.examples) || f.examples.length === 0) e.push("at least one example is required");
  if (!Array.isArray(f.tags) || f.tags.length === 0) e.push("at least one tag is required");
  for (const t of f.tags || []) if (!ID_RE.test(t)) e.push(`tag "${t}" must be kebab-case`);
  if (f.conditions !== undefined && !Array.isArray(f.conditions)) e.push("conditions must be an array");

  const linkKeys = Object.keys(f.links || {});
  if (linkKeys.length === 0) e.push("at least one Mathovia link is required");
  for (const k of linkKeys) {
    if (!LINK_TYPES.includes(k)) e.push(`unknown link type "${k}"`);
    const url = f.links[k];
    if (typeof url !== "string" || !url.startsWith(SITE) || !url.endsWith("/")) {
      e.push(`links.${k} must start with ${SITE} and end with "/" (got ${url})`);
    }
  }

  // Run every example through the compute expression.
  if (!e.length) {
    f.examples.forEach((ex, i) => {
      for (const k of keys) {
        if (typeof ex.inputs?.[k] !== "number") e.push(`examples[${i}] missing numeric input "${k}"`);
      }
      const extra = Object.keys(ex.inputs || {}).filter((k) => !keys.includes(k));
      if (extra.length) e.push(`examples[${i}] has unknown inputs: ${extra.join(", ")}`);
      if (e.length) return;
      let actual;
      try {
        actual = evaluate(f, ex.inputs);
      } catch (err) {
        e.push(`examples[${i}] threw: ${err.message}`);
        return;
      }
      if (!approxEqual(actual, ex.output, ex.tolerance)) {
        e.push(`examples[${i}] expected ${JSON.stringify(ex.output)} but compute gives ${JSON.stringify(actual)}`);
      }
    });
  }
  return e;
}

export function validateAll(formulas) {
  const problems = [];
  const seen = new Map();
  for (const f of formulas) {
    const where = `${f._file} → ${f.id ?? "(no id)"}`;
    if (seen.has(f.id)) problems.push(`${where}: duplicate id (also in ${seen.get(f.id)})`);
    seen.set(f.id, f._file);
    for (const msg of validateFormula(f)) problems.push(`${where}: ${msg}`);
  }
  return problems;
}

export function stripInternal(f) {
  const { _file, ...rest } = f;
  return rest;
}
