// Sets the admin password: `pnpm admin:password` for the live store, `pnpm admin:password --local`
// for .dev.vars. Asks for the password twice without showing it, stores only its hash
// (lib/admin/password.ts), and sets a new session secret alongside, which signs out every session.
// A password changed in the admin since is cleared, so this is also how to recover a lost one.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { hashPassword } from "../lib/admin/password";
import { toBase64Url } from "../lib/base64url";

const MIN_LENGTH = 12;

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    process.stdout.write(question);
    input.setRawMode?.(true);
    input.resume();
    input.setEncoding("utf8");
    let answer = "";
    const onData = (char: string) => {
      if (char === "\u0003") process.exit(1); // Ctrl+C
      if (char === "\r" || char === "\n") {
        input.setRawMode?.(false);
        input.pause();
        input.off("data", onData);
        process.stdout.write("\n");
        resolve(answer);
      } else if (char === "\u007f") {
        answer = answer.slice(0, -1);
      } else {
        answer += char;
      }
    };
    input.on("data", onData);
  });
}

// A password changed in the admin overrides the one set here; clearing it makes this one count.
function clearAdminSetPassword(where: "--local" | "--remote") {
  const result = spawnSync("pnpm", ["exec", "wrangler", "d1", "execute", "DB", where, "--command", "DELETE FROM settings WHERE key = 'admin_password'"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function setLocal(values: Record<string, string>) {
  const file = ".dev.vars";
  let text = existsSync(file) ? readFileSync(file, "utf8") : "";
  for (const [name, value] of Object.entries(values)) {
    // Single quotes: the hash contains `$`, which some .env readers expand inside double quotes.
    const line = `${name}='${value}'`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    // A replacer function, so the `$` in the hash isn't read as a replacement pattern.
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
  }
  writeFileSync(file, text);
  console.log("Saved in .dev.vars. Restart the dev server to use it.");
}

function setRemote(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "put", name], { input: value, stdio: ["pipe", "inherit", "inherit"] });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  console.log("Set on the live store. Sign in again at /admin/login.");
}

async function main() {
  const password = await ask("New admin password: ");
  if (password.length < MIN_LENGTH) {
    console.error(`Use at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }
  if ((await ask("Type it again: ")) !== password) {
    console.error("The two didn't match. Nothing was changed.");
    process.exit(1);
  }
  const values = {
    ADMIN_PASSWORD_HASH: await hashPassword(password),
    ADMIN_SESSION_SECRET: toBase64Url(crypto.getRandomValues(new Uint8Array(32))),
  };
  if (process.argv.includes("--local")) {
    clearAdminSetPassword("--local");
    setLocal(values);
  } else {
    clearAdminSetPassword("--remote");
    setRemote(values);
  }
}

main();
