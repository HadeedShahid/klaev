import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

import { MEDIA_FULL_WIDTH, MEDIA_URL, MEDIA_WIDTHS } from "../lib/media";

import { articleProblems, htmlToBody, JOURNAL_HANDLES, journalStatements, noDashes, pageArticle, policyFlags, type JournalArticle } from "./lib/journal-import";
import { literal, toFile } from "./lib/sql";

// One-off, for cutover: carries the journal articles on Shopify (klaev.com/blogs/blog) to this store's
// journal at the same addresses, so links and search rankings keep working. The articles' text never
// enters the public repository: everything this makes goes in data/private/journal/ (ignored by git).
//
//   pnpm exec tsx scripts/import-journal.ts fetch           each live page into data/private/journal/<handle>.json,
//                                                           with its cover photo; read and edit the JSON after
//   pnpm exec tsx scripts/import-journal.ts apply           covers into the local klaev-media bucket, posts into
//                                                           the local database
//   pnpm exec tsx scripts/import-journal.ts apply --remote  the same on the real bucket and database
//
// Covers are stored the way the admin stores them (storePhoto in lib/admin/media.ts): WebP at
// journal/<handle>/<12 hex>.webp, full size capped at MEDIA_FULL_WIDTH, and one copy per MEDIA_WIDTHS.
// The 12 hex are a hash of the original, so applying again writes the same files and updates the same rows.

const DIR = path.join("data", "private", "journal");
const OUT = path.join(".wrangler", "media");
const SHOPIFY = "https://klaev.com/blogs/blog";
// The deployed store, whose cached pages are told to render again after a remote apply.
const SITE = process.env.SITE_URL ?? "https://klaev.hadeed-shahid08.workers.dev";
const run = promisify(execFile);
const wrangler = (args: string[]) => execFileSync("pnpm", ["exec", "wrangler", ...args], { stdio: "inherit" });

type Saved = Omit<JournalArticle, "coverSrc" | "coverWidth" | "coverHeight"> & { source: string; coverFile: string; coverOriginal: string };
const jsonFile = (handle: string) => path.join(DIR, `${handle}.json`);

async function get(url: string) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Klaev journal import)" } });
    if (response.ok) return response;
    if (response.status !== 429 || attempt === 5) throw new Error(`${url} answered ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 10_000));
  }
}

// Reads each article's page. A JSON already there is kept, since it may have been edited by hand,
// unless --force is passed.
async function fetchArticles(force: boolean) {
  mkdirSync(DIR, { recursive: true });
  for (const handle of JOURNAL_HANDLES) {
    if (existsSync(jsonFile(handle)) && !force) {
      console.log(`${handle}: already fetched, kept`);
      continue;
    }
    const source = `${SHOPIFY}/${handle}`;
    const page = pageArticle(await (await get(source)).text());
    const cover = Buffer.from(await (await get(page.coverUrl)).arrayBuffer());
    const coverFile = path.join(DIR, `${handle}-cover${path.extname(new URL(page.coverUrl).pathname) || ".img"}`);
    writeFileSync(coverFile, cover);

    const saved: Saved = {
      handle,
      source,
      title: noDashes(page.title),
      excerpt: noDashes(page.seoDescription),
      body: noDashes(htmlToBody(page.bodyHtml)),
      coverFile,
      coverOriginal: page.coverUrl,
      coverAlt: noDashes(page.coverAlt),
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      seoTitle: noDashes(page.seoTitle),
      seoDescription: noDashes(page.seoDescription),
    };
    writeFileSync(jsonFile(handle), `${JSON.stringify(saved, null, 2)}\n`);
    console.log(`${handle}: ${saved.body.length} characters, cover ${cover.length} bytes`);
    for (const sentence of policyFlags(saved.body)) console.log(`  check against the policy: ${sentence}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function makeCopies(original: Buffer, key: string) {
  const files: { key: string; file: string }[] = [];
  const write = async (name: string, width: number) => {
    const { data, info } = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const file = path.join(OUT, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
    files.push({ key: name, file });
    return info;
  };
  const full = await write(`${key}.webp`, MEDIA_FULL_WIDTH);
  for (const width of MEDIA_WIDTHS) await write(`${key}-${width}.webp`, width);
  return { full, files };
}

async function put({ key, file }: { key: string; file: string }, remote: boolean) {
  const args = ["exec", "wrangler", "r2", "object", "put", `klaev-media/${key}`, "--file", file, remote ? "--remote" : "--local"];
  args.push("--content-type", "image/webp", "--cache-control", "public, max-age=31536000, immutable");
  for (let attempt = 1; ; attempt++) {
    try {
      await run("pnpm", args);
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

// The deployed build's id, which OpenNext's tag cache puts in front of every tag.
async function liveBuildId() {
  const html = await (await get(`${SITE}/blogs/blog`)).text();
  const id = html.match(/\\?"b\\?":\\?"([\w-]+)/)?.[1];
  if (!id) throw new Error(`No build id on ${SITE}/blogs/blog`);
  return id;
}

async function apply(remote: boolean) {
  const articles: JournalArticle[] = [];
  const uploads: { key: string; file: string }[] = [];
  for (const handle of JOURNAL_HANDLES) {
    const saved: Saved = JSON.parse(readFileSync(jsonFile(handle), "utf8"));
    const original = readFileSync(saved.coverFile);
    const key = `journal/${handle}/${createHash("sha256").update(original).digest("hex").slice(0, 12)}`;
    const { full, files } = await makeCopies(original, key);
    uploads.push(...files);
    const article: JournalArticle = {
      handle,
      title: saved.title,
      excerpt: saved.excerpt?.trim() || null,
      body: saved.body,
      coverSrc: `${MEDIA_URL}/${key}.webp`,
      coverWidth: full.width,
      coverHeight: full.height,
      coverAlt: saved.coverAlt,
      publishedAt: saved.publishedAt,
      updatedAt: saved.updatedAt,
      seoTitle: saved.seoTitle,
      seoDescription: saved.seoDescription,
    };
    const problems = articleProblems(article);
    if (problems.length) throw new Error(`${handle}: ${problems.join("; ")}. Fix ${jsonFile(handle)} and apply again.`);
    articles.push(article);
  }

  // One upload per file: a few at a time on the real bucket (its API answers the odd one with a 500),
  // one at a time locally, where Wrangler's local storage fails when several processes open it.
  const queue = [...uploads];
  await Promise.all(
    Array.from({ length: remote ? 6 : 1 }, async () => {
      for (let upload = queue.shift(); upload; upload = queue.shift()) await put(upload, remote);
    }),
  );
  console.log(`Stored ${articles.length} covers (${uploads.length} files) in the ${remote ? "real" : "local"} klaev-media bucket.`);

  const statements = journalStatements(articles);
  if (remote) {
    // What revalidatePath("/", "layout") does from the admin: the cached pages render again on their next visit.
    const now = Date.now();
    statements.push(`INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (${literal(`${await liveBuildId()}/_N_T_/layout`)}, ${now}, ${now}, NULL)`);
  }
  const sql = path.join(DIR, "posts.sql");
  writeFileSync(sql, toFile(statements));
  wrangler(["d1", "execute", "klaev", remote ? "--remote" : "--local", "--file", sql, ...(remote ? ["-y"] : [])]);
  console.log(`Published ${articles.length} articles on the ${remote ? "real" : "local"} database.`);
}

const [command, ...flags] = process.argv.slice(2);
const task = command === "fetch" ? fetchArticles(flags.includes("--force")) : command === "apply" ? apply(flags.includes("--remote")) : null;
if (!task) {
  console.error("Usage: tsx scripts/import-journal.ts fetch [--force] | apply [--remote]");
  process.exit(1);
}
task.catch((error) => {
  console.error(error);
  process.exit(1);
});
