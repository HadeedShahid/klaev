-- OpenNext's tag cache (d1NextTagCache, binding NEXT_TAG_CACHE_D1): when the app revalidates a page,
-- the time goes here and the next visit renders the page again. The shape is OpenNext's own, which is
-- why it isn't in lib/db/schema.ts.
CREATE TABLE IF NOT EXISTS `revalidations` (
	`tag` text NOT NULL,
	`revalidatedAt` integer NOT NULL,
	`stale` integer,
	`expire` integer DEFAULT NULL,
	UNIQUE(`tag`) ON CONFLICT REPLACE
);
