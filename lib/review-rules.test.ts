import { describe, expect, test } from "vitest";

import { balanceColumns, formatRating, homeSelection, photosFirst, poolOf, ratingSummary, shownName, validateReview } from "./review-rules";

describe("review rules", () => {
  test("a buyer shows as first name and last initial", () => {
    expect(shownName("Ali Khan")).toBe("Ali K.");
    expect(shownName("  muhammad   ali raza ")).toBe("Muhammad R.");
    expect(shownName("hamza")).toBe("Hamza");
    expect(shownName("   ")).toBe("");
  });

  test("the rating is the average to one decimal, and nothing without reviews", () => {
    expect(ratingSummary([])).toBeNull();
    expect(ratingSummary([5, 5, 4])).toEqual({ average: 4.7, count: 3 });
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(4.7)).toBe("4.7");
  });

  test("a review needs a rating and a name; the words are optional", () => {
    expect(validateReview({ rating: "", body: "", name: "Ali K." })).toMatchObject({ ok: false, field: "rating" });
    expect(validateReview({ rating: "6", body: "", name: "Ali K." })).toMatchObject({ ok: false, field: "rating" });
    expect(validateReview({ rating: "5", body: "", name: "  " })).toMatchObject({ ok: false, field: "name" });
    expect(validateReview({ rating: "5", body: "x".repeat(1501), name: "Ali" })).toMatchObject({ ok: false, field: "body" });
    expect(validateReview({ rating: "4", body: "  ", name: " Ali   K. " })).toEqual({
      ok: true,
      value: { rating: 4, body: null, name: "Ali K." },
    });
    expect(validateReview({ rating: "5", body: " Soft. ", name: "Ali" })).toEqual({
      ok: true,
      value: { rating: 5, body: "Soft.", name: "Ali" },
    });
  });

  test("a line's colours share reviews; belts keep their own", () => {
    expect(poolOf({ handle: "black-cropped", collection: "cropped-leather-jackets", sizeGuide: { chart: {} } })).toBe("line:cropped-leather-jackets");
    expect(poolOf({ handle: "black-stitched-leather-belt", collection: "leather-belts", sizeGuide: null })).toBe("product:black-stitched-leather-belt");
  });

  test("the home page waits for three reviews with words, and leads with a short picked one", () => {
    const review = (id: number, body: string | null, featured = false) => ({ id, body, featured });
    expect(homeSelection([review(1, "Soft."), review(2, "Real."), review(3, null)])).toBeNull();

    const long = "x".repeat(200);
    const picked = homeSelection([review(1, "Fits well."), review(2, long, true), review(3, "Real leather.", true), review(4, "Quick delivery.")]);
    expect(picked?.lead.id).toBe(3);
    expect(picked?.rest.map((r) => r.id)).toEqual([2, 1, 4]);

    // Nothing picked: the shortest leads.
    expect(homeSelection([review(1, "Fits well, soft leather."), review(2, "Real."), review(3, "Quick delivery.")])?.lead.id).toBe(2);
  });

  test("photos lead, and wide screens spread cards so the columns stand even", () => {
    const card = (id: number, photo = false, body = "Soft.") => ({ id, photo: photo ? {} : null, body, reply: null, screenshot: null });
    expect(photosFirst([card(1), card(2, true), card(3)]).map((review) => review.id)).toEqual([2, 1, 3]);
    // The photo card stands about three text cards tall, so the next three short ones share the
    // other two columns before the first column takes another.
    expect(balanceColumns([card(1, true), card(2), card(3), card(4), card(5), card(6)])).toEqual([0, 1, 2, 1, 2, 1]);
    expect(balanceColumns([card(1), card(2)], 3)).toEqual([0, 1]);
  });
});
