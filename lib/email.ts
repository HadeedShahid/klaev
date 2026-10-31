import { STORE } from "./store";

// All mail goes through sendEmail(), so changing provider is a change to this file. It sends through
// Cloudflare Email Service (the EMAIL binding in wrangler.jsonc), which takes mail for any address
// once klaev.com is onboarded under Email Sending; the binding sends from this address only.
const FROM = { name: "Klaev", email: "orders@klaev.com" };

export type EmailContent = { subject: string; html: string; text: string };
export type Email = EmailContent & { to: string; replyTo?: string };
export type Mailer = Pick<SendEmail, "send">;

// Never throws. Whatever an email reports on has already happened, so a failed send is logged and
// the order, receipt or message stands.
export async function sendEmail(mailer: Mailer | undefined, { to, replyTo = STORE.email, subject, html, text }: Email) {
  try {
    if (!mailer) throw new Error("No EMAIL binding");
    await mailer.send({ from: FROM, replyTo, to, subject, html, text });
    return true;
  } catch (error) {
    console.error(`Email "${subject}" failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}

// The address links in an email use: the preview's own while testing there, otherwise the real
// store. Only a Worker's own workers.dev name can reach this code, so that Host can be trusted.
export function siteOrigin(host: string | null) {
  return host?.endsWith(".workers.dev") ? `https://${host}` : STORE.siteUrl;
}
