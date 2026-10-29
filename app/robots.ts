import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { robotsFor } from "@/lib/seo";

// Answers by the address asked for: klaev.com is open to crawlers, the workers.dev preview isn't.
export default async function robots(): Promise<MetadataRoute.Robots> {
  return robotsFor((await headers()).get("host"));
}
