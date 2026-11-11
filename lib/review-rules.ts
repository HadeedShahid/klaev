// The rules reviews follow, kept free of the database so the store, the admin, the review form in
// the browser and the scheduled email all read them the same way.

// Reviews with words before the home page gets its chapter.
export const HOME_MIN = 3;
// The most a review's words may run to, and the longest a home page lead quote can be.
export const BODY_MAX = 1500;
const LEAD_MAX = 140;

// How a buyer is shown: first name and the initial of the last, "Ali Khan" as "Ali K.".
export function shownName(full: string) {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  const first = cap(words[0]);
  return words.length > 1 ? `${first} ${words[words.length - 1].charAt(0).toUpperCase()}.` : first;
}

export function ratingSummary(ratings: number[]) {
  if (ratings.length === 0) return null;
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return { average: Math.round(average * 10) / 10, count: ratings.length };
}

// "4.9", always with one decimal, as the stars beside it read.
export const formatRating = (average: number) => average.toFixed(1);

type ReviewInput = { rating: string; body: string; name: string };
export type ReviewFields = { rating: number; body: string | null; name: string };

export function validateReview(
  input: ReviewInput,
): { ok: true; value: ReviewFields } | { ok: false; field: "rating" | "body" | "name"; message: string } {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, field: "rating", message: "Choose a rating, from one to five stars." };
  const body = input.body.trim();
  if (body.length > BODY_MAX) return { ok: false, field: "body", message: `Keep it under ${BODY_MAX.toLocaleString("en-US")} characters.` };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, field: "name", message: "Enter the name to show with your review." };
  if (name.length > 40) return { ok: false, field: "name", message: "Keep the name under 40 characters." };
  return { ok: true, value: { rating, body: body || null, name } };
}

// Jackets of one line share a cut, so a line's colours share their reviews. Products without a size
// guide (belts) are each their own.
export function poolOf(product: { handle: string; collection: string; sizeGuide: unknown }) {
  return product.sizeGuide ? `line:${product.collection}` : `product:${product.handle}`;
}

type Selectable = { featured: boolean; body: string | null };

// The home page chapter: one quote set like a headline, then the rest. Picked reviews come first;
// the lead is the first picked one short enough for a headline, else the shortest. Null until
// there are enough reviews with words.
export function homeSelection<T extends Selectable>(reviews: T[], max = 7) {
  const worded = reviews.filter((review) => review.body);
  if (worded.length < HOME_MIN) return null;
  const ordered = [...worded.filter((review) => review.featured), ...worded.filter((review) => !review.featured)];
  const lead =
    ordered.find((review) => review.featured && review.body!.length <= LEAD_MAX) ??
    [...ordered].sort((a, b) => a.body!.length - b.body!.length)[0];
  return { lead, rest: ordered.filter((review) => review !== lead).slice(0, max - 1) };
}

// Reviews with a photo first, otherwise in the order given: photos lead wherever a buyer sent one.
export function photosFirst<T extends { photo: unknown }>(reviews: T[]) {
  return [...reviews.filter((review) => review.photo), ...reviews.filter((review) => !review.photo)];
}

type Sized = { photo: unknown; screenshot: unknown; body: string | null; reply: string | null };

// Roughly how tall a review card stands, in short text cards: a photo adds about two, long words and
// a reply or a message's screenshot (its link) a little more.
const cardWeight = (review: Sized) =>
  1 + (review.photo ? 2.2 : 0) + (review.body ? review.body.length / 180 : 0) + (review.reply ? 0.3 : 0) + (review.screenshot ? 0.2 : 0);

// Wide screens show the cards in columns of even height: each card, in order, goes to the shortest
// column so far. Returns each card's column.
export function balanceColumns(reviews: Sized[], columns = 3) {
  const heights = Array.from({ length: columns }, () => 0);
  return reviews.map((review) => {
    const column = heights.indexOf(Math.min(...heights));
    heights[column] += cardWeight(review);
    return column;
  });
}
