// The Shopify home page FAQ, rewritten in the brand voice with the facts kept. Answers now state
// the real policies (size exchanges, no refunds, the cash-on-delivery advance); the belt sizing
// question is left out while belts are hidden. Before and after: docs/copy-rewrite.md.
// It's the starting FAQ until one is saved in the admin (lib/faq.ts). {advance}, {cod_fee} and
// {exchange_days} show the store's current terms.
export const HOME_FAQ: { question: string; answer: string }[] = [
  {
    question: "How do I know my Klaev jacket is real, full-grain leather?",
    answer:
      "Every Klaev jacket is cut from full-grain sheepskin or lambskin, or from goatskin suede. Never bonded leather. Three checks when it arrives. It smells earthy, not chemical or sweet. The grain is uneven, with small variations and visible pores. A drop of water soaks in slowly instead of beading off, and the cut edges show fibres.",
  },
  {
    question: "What's the difference between lambskin and goatskin suede jackets?",
    answer:
      "Lambskin is smooth, soft and light. It is supple from day one, works with tailored or casual clothes, and ages into its own patina. Goatskin suede is matte and velvety, with more visible character. For a classic leather jacket, choose lambskin. For something softer and more distinct, choose suede.",
  },
  {
    question: "How should a Klaev leather jacket fit me?",
    answer:
      "Close at the shoulders, with the seam where your shoulder meets your arm. Snug at the chest but never tight: it should close over a t-shirt or a light knit. Sleeves end at the wrist bone. The lambskin and suede jackets finish at the top of the thigh, the cropped jackets at the waist. Every size lists its chest measurement. Between sizes, size up to layer.",
  },
  {
    question: "How do I care for my Klaev jacket?",
    answer: "Keep it away from sharp objects. Never spray cologne or perfume directly onto it.",
  },
  {
    question: "Why is Klaev made in Pakistan?",
    answer:
      "Pakistan is one of the world's largest leather producers: 13 million hides and 47 million skins a year, supplying many international luxury brands. Klaev buys directly from leading Pakistani tanneries and works with a small team of craftsmen, not a mass-production factory. Small batches. Every seam finished by hand. No middlemen. The same leather you find on European boutique racks, at a fraction of the price, and nothing hidden about where it comes from.",
  },
  {
    question: "Do you offer Cash on Delivery?",
    answer:
      "Yes, anywhere in Pakistan. Send a {advance} advance to confirm your order, then pay the rest when it arrives. Cash on delivery adds {cod_fee} delivery. Bank transfer delivers free.",
  },
  {
    question: "What if it does not fit?",
    answer:
      "Message us on WhatsApp within {exchange_days} days of delivery with your order number. If it is unworn with the tags on, we exchange the size. You cover delivery both ways. No refunds.",
  },
];
