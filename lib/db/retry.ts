// In development, Next runs generateStaticParams in a short-lived worker process that opens its own
// copy of Wrangler's local database, and a query there now and then fails while the dev server has
// the file open. Reads can safely run again, so they get a few tries. The real database never needs this.
export async function retryLocalRead<T>(
  read: () => Promise<T>,
  { development = process.env.NODE_ENV === "development", delayMs = 100 } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (!development || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
