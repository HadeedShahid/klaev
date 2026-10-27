import { getCloudflareContext } from "@opennextjs/cloudflare";

import { MEDIA_URL } from "@/lib/media";

// Development only: product photos and journal covers uploaded from the admin land in the local
// bucket, so they're served from here; every other photo is sent on to the real bucket. The live
// store links photos to the bucket directly and never comes through this route.
export async function GET(_: Request, { params }: RouteContext<"/media/[...key]">) {
  const key = (await params).key.join("/");
  if (process.env.NODE_ENV === "development" && /^(products|journal)\/[\w./-]+\.webp$/.test(key)) {
    const { env } = await getCloudflareContext({ async: true });
    const file = await env.MEDIA.get(key);
    if (file) return new Response(file.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" } });
  }
  return Response.redirect(`${MEDIA_URL}/${key}`, 302);
}
