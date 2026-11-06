import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

// app/store.css is built only from the folders and files its @source lines name, so a class used
// in a file it doesn't scan has no style on the store. This follows every import from the store's
// pages and checks each file is scanned.

const ROOT = path.resolve(__dirname, "..");
const STORE_CSS = path.join(ROOT, "app/store.css");

// Reached by the store's pages but holding no classes: server logic and copy.
const NO_STYLES = ["lib/admin/", "data/"];

function walk(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function storeFiles(): string[] {
  const entries = [
    path.join(ROOT, "app/layout.tsx"),
    path.join(ROOT, "app/not-found.tsx"),
    ...walk(path.join(ROOT, "app/(storefront)")).filter((f) => /\.tsx?$/.test(f)),
  ];
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const m of source.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const resolved = resolveImport(file, m[1] ?? m[2]);
      if (resolved && /\.tsx?$/.test(resolved)) stack.push(resolved);
    }
  }
  return [...seen];
}

function sources() {
  const css = fs.readFileSync(STORE_CSS, "utf8");
  const lines = [...css.matchAll(/^@source (not )?"([^"]+)";$/gm)];
  const at = (p: string) => path.resolve(path.dirname(STORE_CSS), p);
  return {
    scanned: lines.filter((m) => !m[1]).map((m) => at(m[2])),
    skipped: lines.filter((m) => m[1]).map((m) => at(m[2])),
  };
}

const inside = (file: string, target: string) => file === target || file.startsWith(target + path.sep);

describe("app/store.css", () => {
  test("scans every file the store's pages import", () => {
    const { scanned, skipped } = sources();
    const unscanned = storeFiles()
      .map((file) => path.relative(ROOT, file))
      .filter((rel) => !NO_STYLES.some((prefix) => rel.startsWith(prefix)))
      .filter((rel) => {
        const file = path.join(ROOT, rel);
        return !scanned.some((s) => inside(file, s)) || skipped.some((s) => inside(file, s));
      });
    expect(unscanned).toEqual([]);
  });

  // Colours defined only in app/admin/admin.css don't exist on the store, so a store file using
  // one (say text-tone-green for a success tick) silently gets no colour. Shared ones go in
  // app/theme.css.
  test("uses no colour that only the admin defines", () => {
    const adminCss = fs.readFileSync(path.join(ROOT, "app/admin/admin.css"), "utf8");
    const adminOnly = [...adminCss.matchAll(/^\s*--color-([a-z0-9-]+):/gm)].map((m) => m[1]);
    const colourClass = new RegExp(
      `(?:^|[\\s"'\`:])(?:text|bg|border(?:-[trblxy])?|ring|fill|stroke|outline|decoration|divide|from|via|to|shadow|caret|accent|placeholder)-(${adminOnly.join("|")})(?![a-z0-9-])`,
    );
    const offenders = storeFiles()
      .map((file) => path.relative(ROOT, file))
      .filter((rel) => !NO_STYLES.some((prefix) => rel.startsWith(prefix)))
      .flatMap((rel) => {
        const hit = fs.readFileSync(path.join(ROOT, rel), "utf8").match(colourClass);
        return hit ? [`${rel}: ${hit[0].trim()}`] : [];
      });
    expect(adminOnly.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  test("leaves the admin out", () => {
    const { scanned, skipped } = sources();
    const admin = [path.join(ROOT, "app/admin"), path.join(ROOT, "components/admin"), path.join(ROOT, "lib/admin")];
    for (const dir of admin) {
      expect(skipped.some((s) => inside(dir, s)) || !scanned.some((s) => inside(dir, s))).toBe(true);
    }
  });
});
