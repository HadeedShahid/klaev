// Writes SQL for the seed and import files, which Wrangler runs against D1 (`wrangler d1 execute --file`).
// Values are inlined, so every one goes through `literal`.

export class Raw {
  constructor(readonly sql: string) {}
}

// A SQL expression placed as is, for lookups such as (SELECT id FROM products WHERE handle = '...').
export const raw = (sql: string) => new Raw(sql);

export function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Raw) return value.sql;
  if (value instanceof Date) return String(Math.floor(value.getTime() / 1000));
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Cannot write ${value} to SQL`);
    return String(value);
  }
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  return literal(JSON.stringify(value));
}

export function insert(table: string, row: Record<string, unknown>): string {
  const columns = Object.keys(row);
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((column) => literal(row[column])).join(", ")})`;
}

export const toFile = (statements: string[]) => statements.map((statement) => `${statement};\n`).join("");
