import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";

import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { receipts } from "@/lib/db/schema";

// A customer's receipt screenshot. The bucket is private and this route, behind the admin
// session, is its only door. Never cached anywhere.
export async function GET(_: Request, { params }: RouteContext<"/admin/receipts/[id]">) {
  if (!(await isAdmin())) return new Response("Sign in first.", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return new Response("Not found.", { status: 404 });

  const [receipt] = await (await getDb()).select().from(receipts).where(eq(receipts.id, id));
  if (!receipt) return new Response("Not found.", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const file = await env.RECEIPTS.get(receipt.key);
  if (!file) return new Response("Not found.", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": receipt.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
