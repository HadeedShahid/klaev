import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { MEDIA_URL, MEDIA_WIDTHS } from "../media";

const MAX_COPY_BYTES = 6 * 1024 * 1024;

// One photo as components/admin/photo-uploader.tsx sends it, already resized in the browser into the
// full-size copy and one copy per stored width, kept in the klaev-media bucket under `folder` the
// way every photo on the store is (lib/media.ts). Returns its public address and size.
export async function storePhoto(
  form: FormData,
  folder: string,
): Promise<{ ok: true; src: string; width: number; height: number } | { ok: false; message: string }> {
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const copies = [["", form.get("full")], ...MEDIA_WIDTHS.map((size) => [`-${size}`, form.get(`w${size}`)] as const)] as const;
  const broken = { ok: false as const, message: "That photo didn't come through. Try again." };
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return broken;
  for (const [, file] of copies) {
    if (!(file instanceof File) || file.type !== "image/webp" || file.size === 0 || file.size > MAX_COPY_BYTES) return broken;
  }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const key = `${folder}/${id}`;
  const { env } = await getCloudflareContext({ async: true });
  await Promise.all(
    copies.map(async ([suffix, file]) =>
      env.MEDIA.put(`${key}${suffix}.webp`, await (file as File).arrayBuffer(), {
        httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
      }),
    ),
  );
  return { ok: true, src: `${MEDIA_URL}/${key}.webp`, width, height };
}

// Removes a stored photo and every copy of it. Photos from elsewhere (none so far) are left alone.
export async function deletePhoto(src: string) {
  if (!src.startsWith(`${MEDIA_URL}/`)) return;
  const key = src.slice(MEDIA_URL.length + 1, -".webp".length);
  const { env } = await getCloudflareContext({ async: true });
  await env.MEDIA.delete([`${key}.webp`, ...MEDIA_WIDTHS.map((size) => `${key}-${size}.webp`)]);
}
