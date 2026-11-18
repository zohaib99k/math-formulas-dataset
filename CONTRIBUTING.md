# Contributing

Thanks for helping. Accuracy matters more than volume here: a single correction is worth more than ten new formulas.

## Report an error

[Open a formula correction issue](https://github.com/zohaib99k/math-formulas-dataset/issues/new?template=formula-correction.md). Include the formula `id`, what is wrong, and a source or a worked counter-example.

## Add or edit a formula

1. Add the entry to the right file in `data/` (`algebra.json`, `calculus.json`, `arithmetic.json`, `trigonometry.json`, `statistics.json`).
2. Follow [`schema/formula.schema.json`](schema/formula.schema.json). In particular:
   - The `id` is kebab-case and permanent. Never rename an existing one, because people link to `#id` anchors.
   - Each `variables[].key` must be a valid identifier used in `compute`.
   - `compute` may use only variable keys and the helpers listed in the README.
   - Include at least one example whose `output` you worked out **independently** (by hand or with another tool), not by running `compute`.
   - `links` must point to an existing page on `https://mathovia.com/` and end with `/`.
   - Write descriptions in your own words, under 280 characters.
3. Run:

   ```bash
   npm install
   npm test          # validation, worked examples, KaTeX parsing
   npm run build     # regenerates dist/, docs/ and the README table
   ```

4. Commit the regenerated `dist/`, `docs/` and `README.md` along with your data change, then open a pull request.

## Releases

Maintainers tag releases as `vX.Y.Z`. Patch releases are corrections, minor releases add formulas, and major releases change the format. If Zenodo is connected, each GitHub release gets a citable DOI.
