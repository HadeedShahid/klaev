import imageLoader from "@/lib/image-loader";
import { formatPKR } from "@/lib/money";
import { STORE, whatsappLink } from "@/lib/store";

// The storefront's Quiet Counter, in what email clients render: tables and inline styles, in the
// hex values of DESIGN.md's tokens. White ground, Panel Grey panels, Ink text, one black pill. No
// dark variant, like the storefront, and Geist only where a client already has it.
const INK = "#1a1a1c";
const QUIET = "#68686d";
const PANEL = "#f5f5f6";
const HAIRLINE = "#e6e6e8";
const ON_INK = "#fcfcfc";
const FONT = `Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const TABULAR = "font-variant-numeric:tabular-nums;";

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const table = (style: string, rows: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;${style}">${rows}</table>`;

export const title = (text: string) =>
  `<h1 class="title" style="margin:32px 0 12px;font-size:32px;line-height:1.15;font-weight:600;letter-spacing:-0.025em;color:${INK};">${escapeHtml(text)}</h1>`;

// The order page's Lead: the one thing to know in Ink, then the explanation in Quiet Grey.
export const lead = (first: string, second?: string) =>
  `<p style="margin:0;font-size:18px;line-height:1.5;font-weight:500;color:${INK};">${escapeHtml(first)}</p>` +
  (second ? `<p style="margin:4px 0 0;font-size:18px;line-height:1.5;color:${QUIET};">${escapeHtml(second)}</p>` : "");

export const heading = (text: string) =>
  `<h2 style="margin:40px 0 16px;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:-0.025em;color:${INK};">${escapeHtml(text)}</h2>`;

export const note = (text: string) => `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:${QUIET};">${escapeHtml(text)}</p>`;

// Words kept as typed, line breaks and all: a customer's message.
export const quoted = (text: string) =>
  `<p style="margin:24px 0 0;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(text).replace(/\r?\n/g, "<br>")}</p>`;

export const textLink = (label: string, href: string) =>
  `<p style="margin:16px 0 0;text-align:center;font-size:14px;line-height:1.5;"><a href="${escapeHtml(href)}" style="color:${INK};text-underline-offset:4px;">${escapeHtml(label)}</a></p>`;

// The one black pill of an email.
export const pill = (label: string, href: string) =>
  `<div style="margin-top:24px;">` +
  table(
    "",
    `<tr><td align="center" bgcolor="${INK}" style="border-radius:999px;"><a href="${escapeHtml(href)}" style="display:block;padding:15px 24px;font-size:15px;line-height:18px;font-weight:500;color:${ON_INK};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a></td></tr>`,
  ) +
  `</div>`;

// The Account Panel: a Panel Grey panel of rows split by hairlines, term left, value right. Each row
// is its own table, so a long IBAN doesn't widen the column every other row shares.
export function panel(rows: { term: string; value: string; strong?: boolean }[]) {
  const cells = rows.map(({ term, value, strong }, index) => {
    const rule = index > 0 ? `border-top:1px solid ${HAIRLINE};` : "";
    const row =
      `<tr><td style="white-space:nowrap;font-size:15px;line-height:20px;color:${QUIET};">${escapeHtml(term)}</td>` +
      `<td align="right" style="padding-left:16px;overflow-wrap:anywhere;font-size:15px;line-height:20px;font-weight:${strong ? 600 : 500};color:${INK};${TABULAR}">${escapeHtml(value)}</td></tr>`;
    return `<tr><td style="${rule}padding:16px 0;">${table("", row)}</td></tr>`;
  });
  return table(`background-color:${PANEL};border-radius:16px;`, `<tr><td style="padding:0 16px;">${table("", cells.join(""))}</td></tr>`);
}

export type EmailLine = {
  title: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  image: { src: string; width: number; height: number } | null;
};

export const lineDetail = (line: EmailLine) => `${line.size ? `Size ${line.size}` : "One size"}${line.quantity > 1 ? `, quantity ${line.quantity}` : ""}`;

// Order Lines: the photo at 48px, name over size, the amount right.
export function orderLines(lines: EmailLine[]) {
  const rows = lines.map((line, index) => {
    const rule = `border-bottom:1px solid ${HAIRLINE};${index === 0 ? `border-top:1px solid ${HAIRLINE};` : ""}`;
    const photo = line.image
      ? `<img src="${escapeHtml(imageLoader({ src: line.image.src, width: 96 }))}" width="48" height="60" alt="" style="display:block;width:48px;height:60px;border-radius:8px;background-color:${PANEL};object-fit:cover;">`
      : `<div style="width:48px;height:60px;border-radius:8px;background-color:${PANEL};"></div>`;
    return (
      `<tr><td width="48" style="${rule}padding:12px 12px 12px 0;vertical-align:middle;">${photo}</td>` +
      `<td style="${rule}padding:12px 0;vertical-align:middle;"><p style="margin:0;font-size:15px;line-height:20px;font-weight:500;color:${INK};">${escapeHtml(line.title)}</p>` +
      `<p style="margin:2px 0 0;font-size:14px;line-height:20px;color:${QUIET};">${escapeHtml(lineDetail(line))}</p></td>` +
      `<td align="right" style="${rule}padding:12px 0 12px 12px;vertical-align:middle;white-space:nowrap;font-size:14px;line-height:20px;font-weight:500;color:${INK};${TABULAR}">${formatPKR(line.unitPrice * line.quantity)}</td></tr>`
    );
  });
  return table("", rows.join(""));
}

// The order page's two-column money list, on white.
export function amounts(rows: { term: string; value: string; strong?: boolean }[]) {
  const cells = rows.map(({ term, value, strong }) => {
    const color = strong ? `font-weight:500;color:${INK};` : `color:${QUIET};`;
    return (
      `<tr><td style="padding:4px 0;font-size:14px;line-height:20px;${color}">${escapeHtml(term)}</td>` +
      `<td align="right" style="padding:4px 0 4px 16px;white-space:nowrap;font-size:14px;line-height:20px;color:${INK};${strong ? "font-weight:500;" : ""}${TABULAR}">${escapeHtml(value)}</td></tr>`
    );
  });
  return `<div style="margin-top:12px;">${table("", cells.join(""))}</div>`;
}

export const address = (lines: string[]) =>
  `<p style="margin:0;font-size:15px;line-height:1.625;color:${INK};${TABULAR}">${lines.map(escapeHtml).join("<br>")}</p>`;

const footer = () => {
  const { street, city } = STORE.address;
  return (
    `<div style="margin-top:40px;padding-top:24px;border-top:1px solid ${HAIRLINE};">` +
    `<p style="margin:0;font-size:14px;line-height:1.5;color:${QUIET};">Questions? Reply to this email, or <a href="${escapeHtml(whatsappLink())}" style="color:${INK};text-underline-offset:4px;">message us on WhatsApp</a>.</p>` +
    `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${QUIET};">Klaev, ${escapeHtml(street)}, ${escapeHtml(city)}</p>` +
    `</div>`
  );
};

// The whole email. `preview` is the line mail apps show beside the subject.
export function page({ subject, preview, body, signOff = true }: { subject: string; preview: string; body: string; signOff?: boolean }) {
  const wordmark = `<p style="margin:0;padding:0 0 20px 0.28em;text-align:center;font-size:17px;line-height:24px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${INK};border-bottom:1px solid ${HAIRLINE};">Klaev</p>`;
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(subject)}</title>` +
    `<style>:root{color-scheme:light}@media (max-width:480px){.sheet{padding:20px 20px 32px!important}.title{font-size:28px!important}}</style></head>` +
    `<body style="margin:0;padding:0;background-color:#ffffff;font-family:${FONT};-webkit-text-size-adjust:100%;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>` +
    table(
      "background-color:#ffffff;",
      `<tr><td align="center">${table("max-width:560px;margin:0 auto;", `<tr><td class="sheet" style="padding:24px 24px 40px;text-align:left;font-family:${FONT};">${wordmark}${body}${signOff ? footer() : ""}</td></tr>`)}</td></tr>`,
    ) +
    `</body></html>`
  );
}
