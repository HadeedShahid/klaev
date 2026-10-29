import { describe, expect, test } from "vitest";

import { filtersQuery, readOrderFilters } from "./order-filters";

// 29 October 2026, mid-morning in Lahore.
const NOW = new Date("2026-10-29T10:00:00+05:00");
const day = (text: string) => new Date(`${text}T00:00:00+05:00`);

describe("order filters from the address bar", () => {
  test("nothing chosen is every order", () => {
    expect(readOrderFilters({}, NOW)).toEqual({});
  });

  test("payment method and where the money stands, ignoring anything unknown", () => {
    expect(readOrderFilters({ method: "cod", paid: "unpaid" }, NOW)).toEqual({ method: "cod", paid: "unpaid" });
    expect(readOrderFilters({ method: "card", paid: "maybe" }, NOW)).toEqual({});
  });

  test("date presets are Pakistan days, ending at the end of today", () => {
    expect(readOrderFilters({ placed: "today" }, NOW)).toEqual({ placed: "today", from: day("2026-10-29"), to: day("2026-10-30") });
    expect(readOrderFilters({ placed: "yesterday" }, NOW)).toEqual({ placed: "yesterday", from: day("2026-10-28"), to: day("2026-10-29") });
    expect(readOrderFilters({ placed: "7d" }, NOW)).toEqual({ placed: "7d", from: day("2026-10-23"), to: day("2026-10-30") });
    expect(readOrderFilters({ placed: "30d" }, NOW)).toEqual({ placed: "30d", from: day("2026-09-30"), to: day("2026-10-30") });
    expect(readOrderFilters({ placed: "month" }, NOW)).toEqual({ placed: "month", from: day("2026-10-01"), to: day("2026-10-30") });
    expect(readOrderFilters({ placed: "last_month" }, NOW)).toEqual({ placed: "last_month", from: day("2026-09-01"), to: day("2026-10-01") });
    // Just after midnight in Lahore is already the next day there, though not yet in London.
    expect(readOrderFilters({ placed: "today" }, new Date("2026-10-29T19:30:00Z"))).toMatchObject({ from: day("2026-10-30") });
  });

  test("a custom range includes both its days, either way round, and either end can be left open", () => {
    expect(readOrderFilters({ placed: "custom", from: "2026-10-01", to: "2026-10-15" }, NOW)).toEqual({
      placed: "custom",
      from: day("2026-10-01"),
      to: day("2026-10-16"),
      fromDay: "2026-10-01",
      toDay: "2026-10-15",
    });
    expect(readOrderFilters({ placed: "custom", from: "2026-10-15", to: "2026-10-01" }, NOW)).toMatchObject({ from: day("2026-10-01"), to: day("2026-10-16") });
    expect(readOrderFilters({ placed: "custom", from: "2026-10-20" }, NOW)).toEqual({ placed: "custom", from: day("2026-10-20"), fromDay: "2026-10-20" });
    expect(readOrderFilters({ placed: "custom", from: "20 October" }, NOW)).toEqual({ placed: "custom" });
  });

  test("the filters go back into a link, so tabs, paging and the export keep them", () => {
    const filters = readOrderFilters({ method: "bank_transfer", placed: "custom", from: "2026-10-01", to: "2026-10-15" }, NOW);
    expect(filtersQuery(filters).toString()).toBe("method=bank_transfer&placed=custom&from=2026-10-01&to=2026-10-15");
    expect(filtersQuery(readOrderFilters({ paid: "paid", placed: "7d" }, NOW)).toString()).toBe("paid=paid&placed=7d");
  });
});
