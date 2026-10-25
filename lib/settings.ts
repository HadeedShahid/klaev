import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { settings } from "./db/schema";

export type BankAccount = { bank: string; accountTitle: string; accountNumber: string; iban?: string };

function isBankAccount(value: unknown): value is BankAccount {
  if (typeof value !== "object" || value === null) return false;
  const { bank, accountTitle, accountNumber } = value as Record<string, unknown>;
  return [bank, accountTitle, accountNumber].every((field) => typeof field === "string" && field.length > 0);
}

// The account that bank transfers and cash on delivery advances go to. It is set in the database,
// so the number never sits in the public repository. Null until it has been set.
export async function getBankAccount(): Promise<BankAccount | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "bank") });
  return isBankAccount(row?.value) ? row.value : null;
}
