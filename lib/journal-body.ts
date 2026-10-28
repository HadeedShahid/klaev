// A journal article's body as written in the admin: plain text, where a blank line starts a new
// paragraph, a line starting "## " is a heading, and lines starting "- " make a list. Nothing in
// it is HTML, so nothing written there can break the page.
export type BodyBlock = { kind: "heading"; text: string } | { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    let paragraph: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      if (list.length) blocks.push({ kind: "list", items: list });
      paragraph = [];
      list = [];
    };
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        blocks.push({ kind: "heading", text: line.slice(3).trim() });
      } else if (line.startsWith("- ")) {
        if (paragraph.length) flush();
        list.push(line.slice(2).trim());
      } else {
        if (list.length) flush();
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}

// A line's text with its links: [words](/path), [words](https://...) or [words](mailto:...). Any
// other target stays as plain text, so nothing written there can run script.
export type InlinePart = { text: string; href?: string };
const LINK = /\[([^\]]+)\]\(((?:\/(?!\/)|https:\/\/|mailto:)[^)\s]*)\)/g;

export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], href: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// The body's words without link targets, for counting and for search descriptions.
export const plainText = (text: string) => text.replace(LINK, "$1");

// About how long it takes to read, at 220 words a minute.
export function readingMinutes(body: string) {
  return Math.max(1, Math.round(plainText(body).split(/\s+/).filter(Boolean).length / 220));
}
