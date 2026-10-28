import "server-only";

import { and, isNotNull, isNull, lt } from "drizzle-orm";

import type { Db } from "./db";
import { checkouts, events, messages } from "./db/schema";

const DAY = 24 * 60 * 60 * 1000;

// How long the store keeps what isn't an order, as the privacy policy says: pages viewed for 12
// months, unfinished checkouts for 30 days, handled messages for 12 months. Run when the admin opens
// the screens that read them, so it needs no scheduled job; each delete uses an index and is cheap.
export const KEEP = { events: 365, checkouts: 30, messages: 365 } as const;

export async function forgetOldData(db: Db, now = new Date()) {
  const before = (days: number) => new Date(now.getTime() - days * DAY);
  await db.batch([
    db.delete(events).where(lt(events.createdAt, before(KEEP.events))),
    db.delete(checkouts).where(and(isNull(checkouts.orderId), lt(checkouts.updatedAt, before(KEEP.checkouts)))),
    db.delete(messages).where(and(isNotNull(messages.handledAt), lt(messages.handledAt, before(KEEP.messages)))),
  ]);
}
