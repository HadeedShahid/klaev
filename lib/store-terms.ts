import { formatPKR } from "./money";
import type { CodTerms } from "./payment";
import { STORE } from "./store";

// Words written into the FAQ and the store's pages that show the current terms and contact
// details, so what they say never disagrees with checkout.
export const TERM_PLACEHOLDERS = ["{advance}", "{cod_fee}", "{exchange_days}", "{delivery_days}", "{whatsapp}", "{email}"] as const;

export function fillTerms(text: string, terms: CodTerms) {
  return text
    .replaceAll("{advance}", formatPKR(terms.codAdvance))
    .replaceAll("{cod_fee}", formatPKR(terms.codDeliveryFee))
    .replaceAll("{exchange_days}", String(STORE.exchangeDays))
    .replaceAll("{delivery_days}", STORE.deliveryDays)
    .replaceAll("{whatsapp}", STORE.whatsappDisplay)
    .replaceAll("{email}", STORE.email);
}
