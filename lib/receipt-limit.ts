// The largest receipt the store keeps. A phone or laptop screenshot of a transfer comes in well under
// it. The browser checks it before uploading and the server checks it again; a file over it is turned
// away with this message, never changed.
export const MAX_RECEIPT_MB = 10;
export const MAX_RECEIPT_BYTES = MAX_RECEIPT_MB * 1024 * 1024;
export const RECEIPT_TOO_BIG = `That file is over ${MAX_RECEIPT_MB} MB. Choose a smaller screenshot, or send it on WhatsApp.`;
