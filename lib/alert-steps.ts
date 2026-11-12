// The steps of turning alerts on in the browser (components/admin/alerts-card.tsx), each with an
// end: a step that never answers is given up on with what to do next, so the Settings card never
// spins for good.

export class Stuck extends Error {}

export const PERMISSION_STUCK = "Still waiting for notifications to be allowed. Allow them for klaev.com in Chrome, then tap Turn on alerts again.";
export const HELPER_STUCK = "The alerts helper didn't start. Refresh the page and try again.";
export const PUSH_STUCK = "Google's push service didn't answer. Check the phone has internet and Google Play services, then try again.";
export const STORE_STUCK = "The store didn't answer. Check the phone has internet, then try again.";

export function within<T>(step: Promise<T>, seconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Stuck(message)), seconds * 1000);
  });
  return Promise.race([step, late]).finally(() => clearTimeout(timer));
}

type Permission = "default" | "granted" | "denied";
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Asks to show notifications. The answer can also come from the browser's site settings, which
// leaves the question itself waiting for good, so the permission is looked at twice a second too.
export async function askPermission(
  request: () => Promise<Permission>,
  current: () => Permission,
  { seconds = 30, sleep = pause }: { seconds?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Permission> {
  const asked = request().then((answer) => ({ answer }));
  for (let tick = 0; tick < seconds * 2; tick++) {
    const answered = await Promise.race([asked, sleep(500).then(() => null)]);
    if (answered) return answered.answer;
    const now = current();
    if (now !== "default") return now;
  }
  throw new Stuck(PERMISSION_STUCK);
}
