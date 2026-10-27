import "server-only";

import { eq } from "drizzle-orm";

import { getDb, type Db } from "./db";
import { settings } from "./db/schema";
import type { CodTerms } from "./payment";
import { STORE } from "./store";

export type { CodTerms };

export type BankAccount = { bank: string; accountTitle: string; accountNumber: string; iban?: string };

function isBankAccount(value: unknown): value is BankAccount {
  if (typeof value !== "object" || value === null) return false;
  const { bank, accountTitle, accountNumber } = value as Record<string, unknown>;
  return [bank, accountTitle, accountNumber].every((field) => typeof field === "string" && field.length > 0);
}

async function read(db: Db | undefined, key: string) {
  const row = await (db ?? (await getDb())).query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value;
}

async function write(db: Db, key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

// The account that bank transfers and cash on delivery advances go to. It is set in the database,
// so the number never sits in the public repository. Null until it has been set.
export async function getBankAccount(db?: Db): Promise<BankAccount | null> {
  const value = await read(db, "bank");
  return isBankAccount(value) ? value : null;
}

export async function saveBankAccount(db: Db, input: BankAccount): Promise<{ ok: true } | { ok: false; message: string }> {
  const account = {
    bank: input.bank.trim(),
    accountTitle: input.accountTitle.trim(),
    accountNumber: input.accountNumber.replace(/\s+/g, ""),
    ...(input.iban?.trim() ? { iban: input.iban.replace(/\s+/g, "").toUpperCase() } : {}),
  };
  if (!account.bank || !account.accountTitle || !account.accountNumber) return { ok: false, message: "Add the bank, the account title and the account number." };
  if (!/^\d{6,24}$/.test(account.accountNumber)) return { ok: false, message: "The account number is digits only." };
  if (account.iban && !/^PK\d{2}[A-Z]{4}\d{16}$/.test(account.iban)) return { ok: false, message: "A Pakistani IBAN is PK, two digits, four letters and 16 digits." };
  await write(db, "bank", account);
  return { ok: true };
}

// What cash on delivery costs the customer. Bank transfers deliver free. Until changed in Settings,
// the store's long-standing terms.
export const COD_DEFAULTS: CodTerms = { codDeliveryFee: STORE.codDeliveryFee, codAdvance: STORE.codAdvance };

export async function getCodTerms(db?: Db): Promise<CodTerms> {
  const value = ((await read(db, "checkout")) ?? {}) as Partial<CodTerms>;
  const pick = (name: keyof CodTerms) => (Number.isSafeInteger(value[name]) ? (value[name] as number) : COD_DEFAULTS[name]);
  return { codDeliveryFee: pick("codDeliveryFee"), codAdvance: pick("codAdvance") };
}

export async function saveCodTerms(db: Db, terms: CodTerms): Promise<{ ok: true } | { ok: false; message: string }> {
  const rupees = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= 100_000;
  if (!rupees(terms.codDeliveryFee) || !rupees(terms.codAdvance)) return { ok: false, message: "Both are whole numbers of rupees." };
  await write(db, "checkout", terms);
  return { ok: true };
}
